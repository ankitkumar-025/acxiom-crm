const { db } = require('../config/database');

class DashboardService {
  static getMetrics(user, dateRange = 'All', customStart = null, customEnd = null) {
    const isSales = user && user.role === 'SalesExecutive';
    const userId = user ? user.userId : null;

    // Build date filter clause
    let dateClauseCust = '';
    let dateClauseLead = '';
    let dateClauseOpp = '';
    const paramsCust = [];
    const paramsLead = [];
    const paramsOpp = [];

    if (isSales) {
      dateClauseCust += ' AND CreatedBy = ?';
      paramsCust.push(userId);
      dateClauseLead += ' AND AssignedTo = ?';
      paramsLead.push(userId);
      dateClauseOpp += ' AND AssignedTo = ?';
      paramsOpp.push(userId);
    }

    if (dateRange === 'Today') {
      dateClauseCust += " AND date(CreatedDate) = date('now', 'localtime')";
      dateClauseLead += " AND date(CreatedDate) = date('now', 'localtime')";
      dateClauseOpp += " AND date(CreatedDate) = date('now', 'localtime')";
    } else if (dateRange === 'ThisWeek') {
      dateClauseCust += " AND date(CreatedDate) >= date('now', 'weekday 0', '-7 days')";
      dateClauseLead += " AND date(CreatedDate) >= date('now', 'weekday 0', '-7 days')";
      dateClauseOpp += " AND date(CreatedDate) >= date('now', 'weekday 0', '-7 days')";
    } else if (dateRange === 'ThisMonth') {
      dateClauseCust += " AND strftime('%Y-%m', CreatedDate) = strftime('%Y-%m', 'now', 'localtime')";
      dateClauseLead += " AND strftime('%Y-%m', CreatedDate) = strftime('%Y-%m', 'now', 'localtime')";
      dateClauseOpp += " AND strftime('%Y-%m', CreatedDate) = strftime('%Y-%m', 'now', 'localtime')";
    } else if (dateRange === 'Custom' && customStart && customEnd) {
      dateClauseCust += " AND date(CreatedDate) >= date(?) AND date(CreatedDate) <= date(?)";
      paramsCust.push(customStart, customEnd);
      dateClauseLead += " AND date(CreatedDate) >= date(?) AND date(CreatedDate) <= date(?)";
      paramsLead.push(customStart, customEnd);
      dateClauseOpp += " AND date(CreatedDate) >= date(?) AND date(CreatedDate) <= date(?)";
      paramsOpp.push(customStart, customEnd);
    }

    // 1. Total Customers
    const totalCustomers = db.prepare(`SELECT COUNT(*) AS count FROM Customers WHERE 1=1 ${dateClauseCust}`).get(...paramsCust).count;

    // 2. Leads (Total & Open)
    const totalLeads = db.prepare(`SELECT COUNT(*) AS count FROM Leads WHERE 1=1 ${dateClauseLead}`).get(...paramsLead).count;
    const openLeads = db.prepare(`SELECT COUNT(*) AS count FROM Leads WHERE Status NOT IN ('Converted', 'Lost') ${dateClauseLead}`).get(...paramsLead).count;

    // 3. Opportunities (Total, Open, Won, Lost, Pipeline Value)
    const totalOpportunities = db.prepare(`SELECT COUNT(*) AS count FROM Opportunities WHERE 1=1 ${dateClauseOpp}`).get(...paramsOpp).count;
    const openOpportunities = db.prepare(`SELECT COUNT(*) AS count FROM Opportunities WHERE Status = 'Open' ${dateClauseOpp}`).get(...paramsOpp).count;
    const wonOpportunities = db.prepare(`SELECT COUNT(*) AS count FROM Opportunities WHERE Status = 'Won' ${dateClauseOpp}`).get(...paramsOpp).count;
    const lostOpportunities = db.prepare(`SELECT COUNT(*) AS count FROM Opportunities WHERE Status = 'Lost' ${dateClauseOpp}`).get(...paramsOpp).count;

    const pipelineValueResult = db.prepare(`
      SELECT SUM(Amount) AS totalVal, SUM((Amount * Probability) / 100) AS weightedVal
      FROM Opportunities
      WHERE Status = 'Open' ${dateClauseOpp}
    `).get(...paramsOpp);

    const pipelineValue = pipelineValueResult.totalVal || 0;
    const weightedPipelineValue = Math.round(pipelineValueResult.weightedVal || 0);

    // 4. Chart 1: Lead Status Breakdown
    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
    const leadStatusCounts = {};
    leadStatuses.forEach(s => { leadStatusCounts[s] = 0; });

    let leadChartSql = `SELECT Status, COUNT(*) AS count FROM Leads WHERE 1=1`;
    const leadChartParams = [];
    if (isSales) {
      leadChartSql += ` AND AssignedTo = ?`;
      leadChartParams.push(userId);
    }
    leadChartSql += ` GROUP BY Status`;
    const leadDbResults = db.prepare(leadChartSql).all(...leadChartParams);
    leadDbResults.forEach(r => { leadStatusCounts[r.Status] = r.count; });

    // 5. Chart 2: Opportunity Pipeline Stages
    const oppStages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    const oppStageData = {};
    oppStages.forEach(st => { oppStageData[st] = { count: 0, amount: 0 }; });

    let oppChartSql = `SELECT Stage, COUNT(*) AS count, SUM(Amount) AS amount FROM Opportunities WHERE 1=1`;
    const oppChartParams = [];
    if (isSales) {
      oppChartSql += ` AND AssignedTo = ?`;
      oppChartParams.push(userId);
    }
    oppChartSql += ` GROUP BY Stage`;
    const oppDbResults = db.prepare(oppChartSql).all(...oppChartParams);
    oppDbResults.forEach(r => {
      oppStageData[r.Stage] = { count: r.count, amount: r.amount || 0 };
    });

    // 6. Chart 3: Monthly Sales / Performance Trend (Last 6 Months)
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const monthSql = `
        SELECT 
          strftime('%Y-%m', date('now', '-${i} months')) AS monthLabel,
          SUM(CASE WHEN Status = 'Won' THEN Amount ELSE 0 END) AS wonAmount,
          SUM(CASE WHEN Status = 'Open' THEN Amount ELSE 0 END) AS openAmount,
          SUM(CASE WHEN Status = 'Lost' THEN Amount ELSE 0 END) AS lostAmount
        FROM Opportunities
        WHERE strftime('%Y-%m', CreatedDate) = strftime('%Y-%m', date('now', '-${i} months'))
        ${isSales ? 'AND AssignedTo = ?' : ''}
      `;
      const monthParams = isSales ? [userId] : [];
      const row = db.prepare(monthSql).get(...monthParams);
      monthlySales.push({
        month: row.monthLabel,
        won: row.wonAmount || 0,
        open: row.openAmount || 0,
        lost: row.lostAmount || 0
      });
    }

    // 7. Upcoming and Overdue Follow-Ups for quick view
    let followUpSql = `
      SELECT f.*, c.CustomerName, l.LeadName
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      WHERE f.Status = 'Planned'
      ${isSales ? 'AND f.AssignedTo = ?' : ''}
      ORDER BY f.FollowUpDate ASC LIMIT 5
    `;
    const upcomingFollowUps = db.prepare(followUpSql).all(...(isSales ? [userId] : []));

    // 8. Recent Activities & Audit Trail
    let recentAuditSql = `
      SELECT * FROM AuditLogs
      ${isSales ? 'WHERE UserId = ?' : ''}
      ORDER BY AuditLogId DESC LIMIT 6
    `;
    const recentAudits = db.prepare(recentAuditSql).all(...(isSales ? [userId] : []));

    return {
      kpis: {
        totalCustomers,
        totalLeads,
        openLeads,
        totalOpportunities,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        pipelineValue,
        weightedPipelineValue
      },
      charts: {
        leadStatus: {
          labels: leadStatuses,
          data: leadStatuses.map(s => leadStatusCounts[s])
        },
        pipelineStages: {
          labels: oppStages,
          counts: oppStages.map(st => oppStageData[st].count),
          amounts: oppStages.map(st => oppStageData[st].amount)
        },
        monthlySales: {
          labels: monthlySales.map(m => m.month),
          won: monthlySales.map(m => m.won),
          open: monthlySales.map(m => m.open),
          lost: monthlySales.map(m => m.lost)
        }
      },
      upcomingFollowUps,
      recentAudits,
      dateRange
    };
  }
}

module.exports = DashboardService;
