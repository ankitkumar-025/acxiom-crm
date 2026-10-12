const { db } = require('../config/database');

class ReportService {
  /**
   * Helper to convert an array of objects into CSV format
   */
  static toCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(field => {
        let val = row[field];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\r\n');
  }

  // 1. Customer Report
  static getCustomerReport(user, filters = {}) {
    let sql = `
      SELECT c.CustomerCode, c.CustomerName, c.Email, c.Phone, c.CompanyName, c.City, c.State, c.Status,
             u.Name AS OwnerName, c.CreatedDate
      FROM Customers c
      LEFT JOIN Users u ON c.CreatedBy = u.UserId
      WHERE 1=1
    `;
    const params = [];
    if (user && user.role === 'SalesExecutive') {
      sql += ' AND c.CreatedBy = ?';
      params.push(user.userId);
    }
    if (filters.status) {
      sql += ' AND c.Status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY c.CustomerId DESC';
    return db.prepare(sql).all(...params);
  }

  // 2. Lead Report
  static getLeadReport(user, filters = {}) {
    let sql = `
      SELECT l.LeadCode, l.LeadName, l.Email, l.Phone, l.CompanyName, l.Source, l.Status, l.Priority,
             l.ExpectedValue, u.Name AS AssignedName, l.CreatedDate,
             CASE WHEN l.Status = 'Converted' THEN 'Yes' ELSE 'No' END AS IsConverted
      FROM Leads l
      LEFT JOIN Users u ON l.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];
    if (user && user.role === 'SalesExecutive') {
      sql += ' AND l.AssignedTo = ?';
      params.push(user.userId);
    }
    if (filters.status) {
      sql += ' AND l.Status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY l.LeadId DESC';
    return db.prepare(sql).all(...params);
  }

  // 3. Follow-Up Report
  static getFollowUpReport(user, filters = {}) {
    let sql = `
      SELECT f.FollowUpId, f.FollowUpType, f.Subject, f.FollowUpDate, f.Status, f.Remarks,
             c.CustomerName, l.LeadName, u.Name AS AssignedName, f.CreatedDate, f.CompletedDate
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      LEFT JOIN Users u ON f.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];
    if (user && user.role === 'SalesExecutive') {
      sql += ' AND f.AssignedTo = ?';
      params.push(user.userId);
    }
    if (filters.status) {
      sql += ' AND f.Status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY f.FollowUpDate ASC';
    return db.prepare(sql).all(...params);
  }

  // 4. Opportunity Report
  static getOpportunityReport(user, filters = {}) {
    let sql = `
      SELECT o.OpportunityName, c.CustomerName, o.Amount, o.Stage, o.Probability,
             ROUND((o.Amount * o.Probability) / 100, 2) AS WeightedAmount,
             o.ExpectedCloseDate, o.Status, u.Name AS AssignedName, o.CreatedDate
      FROM Opportunities o
      JOIN Customers c ON o.CustomerId = c.CustomerId
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];
    if (user && user.role === 'SalesExecutive') {
      sql += ' AND o.AssignedTo = ?';
      params.push(user.userId);
    }
    if (filters.stage) {
      sql += ' AND o.Stage = ?';
      params.push(filters.stage);
    }
    sql += ' ORDER BY o.OpportunityId DESC';
    return db.prepare(sql).all(...params);
  }

  // 5. Pipeline Report (Stage-wise and Owner-wise aggregate)
  static getPipelineReport(user) {
    let stageSql = `
      SELECT o.Stage, COUNT(*) AS OpportunityCount, SUM(o.Amount) AS TotalAmount,
             ROUND(SUM((o.Amount * o.Probability) / 100), 2) AS WeightedPipeline
      FROM Opportunities o
      WHERE 1=1
    `;
    let ownerSql = `
      SELECT COALESCE(u.Name, 'Unassigned') AS OwnerName,
             COUNT(*) AS OpportunityCount, SUM(o.Amount) AS TotalAmount,
             ROUND(SUM((o.Amount * o.Probability) / 100), 2) AS WeightedPipeline
      FROM Opportunities o
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];
    if (user && user.role === 'SalesExecutive') {
      stageSql += ' AND o.AssignedTo = ?';
      ownerSql += ' AND o.AssignedTo = ?';
      params.push(user.userId);
    }
    stageSql += ' GROUP BY o.Stage ORDER BY TotalAmount DESC';
    ownerSql += ' GROUP BY o.AssignedTo ORDER BY TotalAmount DESC';

    const stageData = db.prepare(stageSql).all(...params);
    const ownerData = db.prepare(ownerSql).all(...params);

    return { stageData, ownerData };
  }

  // 6. Lead Conversion Report
  static getConversionReport(user) {
    let sql = `
      SELECT 
        Source,
        COUNT(*) AS TotalLeads,
        SUM(CASE WHEN Status = 'Converted' THEN 1 ELSE 0 END) AS ConvertedLeads,
        SUM(CASE WHEN Status = 'Lost' THEN 1 ELSE 0 END) AS LostLeads,
        ROUND(CAST(SUM(CASE WHEN Status = 'Converted' THEN 1 ELSE 0 END) AS REAL) * 100 / COUNT(*), 1) AS ConversionRatePercent,
        SUM(ExpectedValue) AS TotalExpectedValue
      FROM Leads
      WHERE 1=1
    `;
    const params = [];
    if (user && user.role === 'SalesExecutive') {
      sql += ' AND AssignedTo = ?';
      params.push(user.userId);
    }
    sql += ' GROUP BY Source ORDER BY TotalLeads DESC';

    return db.prepare(sql).all(...params);
  }

  // 7. User Activity Report
  static getUserActivityReport(user) {
    let sql = `
      SELECT 
        u.UserId, u.Name, u.Email, u.Role,
        (SELECT COUNT(*) FROM Customers WHERE CreatedBy = u.UserId) AS CustomersCreated,
        (SELECT COUNT(*) FROM Leads WHERE AssignedTo = u.UserId) AS LeadsAssigned,
        (SELECT COUNT(*) FROM Opportunities WHERE AssignedTo = u.UserId) AS OpportunitiesAssigned,
        (SELECT COUNT(*) FROM FollowUps WHERE AssignedTo = u.UserId) AS FollowUpsAssigned,
        (SELECT COUNT(*) FROM FollowUps WHERE AssignedTo = u.UserId AND Status = 'Completed') AS FollowUpsCompleted,
        (SELECT COUNT(*) FROM Activities WHERE AssignedTo = u.UserId) AS ActivitiesLogged
      FROM Users u
      WHERE u.IsActive = 1
      ORDER BY u.Name ASC
    `;
    return db.prepare(sql).all();
  }

  // 8. Audit Report
  static getAuditReport(user, filters = {}) {
    let sql = `
      SELECT a.AuditLogId, a.CreatedDate, a.UserEmail, a.Action, a.EntityName, a.RecordId, a.Details, a.IpAddress
      FROM AuditLogs a
      WHERE 1=1
    `;
    const params = [];
    if (filters.action) {
      sql += ' AND a.Action = ?';
      params.push(filters.action);
    }
    if (filters.entityName) {
      sql += ' AND a.EntityName = ?';
      params.push(filters.entityName);
    }
    sql += ' ORDER BY a.AuditLogId DESC LIMIT 200';
    return db.prepare(sql).all(...params);
  }
}

module.exports = ReportService;
