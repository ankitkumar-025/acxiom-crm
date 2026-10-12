const { db } = require('../config/database');
const AuditService = require('../services/auditService');

class Activity {
  static getFiltered({ type = '', status = '', user = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT a.*,
        c.CustomerName, c.CustomerCode,
        l.LeadName, l.LeadCode,
        u.Name AS AssignedName
      FROM Activities a
      LEFT JOIN Customers c ON a.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON a.LeadId = l.LeadId
      LEFT JOIN Users u ON a.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND a.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (type) {
      sql += ` AND a.ActivityType = ?`;
      params.push(type);
    }

    if (status) {
      sql += ` AND a.Status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.ActivityDate DESC, a.ActivityId DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  static getCount({ type = '', status = '', user = null } = {}) {
    let sql = `SELECT COUNT(*) AS count FROM Activities a WHERE 1=1`;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND a.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (type) {
      sql += ` AND a.ActivityType = ?`;
      params.push(type);
    }

    if (status) {
      sql += ` AND a.Status = ?`;
      params.push(status);
    }

    return db.prepare(sql).get(...params).count;
  }

  static create(data, user, ipAddress = '127.0.0.1') {
    const stmt = db.prepare(`
      INSERT INTO Activities (ActivityType, Subject, Description, ActivityDate, CustomerId, LeadId, OpportunityId, AssignedTo, Status, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const result = stmt.run(
      data.ActivityType || 'Call',
      data.Subject.trim(),
      (data.Description || '').trim(),
      data.ActivityDate || new Date().toISOString().split('T')[0],
      data.CustomerId ? parseInt(data.CustomerId) : null,
      data.LeadId ? parseInt(data.LeadId) : null,
      data.OpportunityId ? parseInt(data.OpportunityId) : null,
      data.AssignedTo || user.userId,
      data.Status || 'Completed'
    );

    const newId = result.lastInsertRowid;

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Create',
      entityName: 'Activity',
      recordId: String(newId),
      details: `Logged ${data.ActivityType} activity: "${data.Subject}".`,
      ipAddress
    });

    return newId;
  }
}

module.exports = Activity;
