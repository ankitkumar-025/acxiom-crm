const { db } = require('../config/database');
const AuditService = require('../services/auditService');

class FollowUp {
  static getFiltered({ status = '', search = '', user = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT f.*, 
        c.CustomerName, c.CustomerCode,
        l.LeadName, l.LeadCode,
        o.OpportunityName,
        u.Name AS AssignedName
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      LEFT JOIN Opportunities o ON f.OpportunityId = o.OpportunityId
      LEFT JOIN Users u ON f.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND f.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (status) {
      if (status === 'Upcoming') {
        sql += ` AND f.Status = 'Planned' AND date(f.FollowUpDate) >= date('now', 'localtime')`;
      } else if (status === 'Overdue') {
        sql += ` AND f.Status = 'Planned' AND date(f.FollowUpDate) < date('now', 'localtime')`;
      } else {
        sql += ` AND f.Status = ?`;
        params.push(status);
      }
    }

    if (search) {
      sql += ` AND (f.Subject LIKE ? OR c.CustomerName LIKE ? OR l.LeadName LIKE ? OR f.FollowUpType LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY f.FollowUpDate ASC, f.FollowUpId DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  static getCount({ status = '', search = '', user = null } = {}) {
    let sql = `
      SELECT COUNT(*) AS count
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      WHERE 1=1
    `;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND f.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (status) {
      if (status === 'Upcoming') {
        sql += ` AND f.Status = 'Planned' AND date(f.FollowUpDate) >= date('now', 'localtime')`;
      } else if (status === 'Overdue') {
        sql += ` AND f.Status = 'Planned' AND date(f.FollowUpDate) < date('now', 'localtime')`;
      } else {
        sql += ` AND f.Status = ?`;
        params.push(status);
      }
    }

    if (search) {
      sql += ` AND (f.Subject LIKE ? OR c.CustomerName LIKE ? OR l.LeadName LIKE ? OR f.FollowUpType LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    return db.prepare(sql).get(...params).count;
  }

  static findById(id, user = null) {
    let sql = `
      SELECT f.*, 
        c.CustomerName, c.CustomerCode,
        l.LeadName, l.LeadCode,
        o.OpportunityName,
        u.Name AS AssignedName
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      LEFT JOIN Opportunities o ON f.OpportunityId = o.OpportunityId
      LEFT JOIN Users u ON f.AssignedTo = u.UserId
      WHERE f.FollowUpId = ?
    `;
    const params = [id];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND f.AssignedTo = ?`;
      params.push(user.userId);
    }

    return db.prepare(sql).get(...params);
  }

  static create(data, user, ipAddress = '127.0.0.1') {
    const stmt = db.prepare(`
      INSERT INTO FollowUps (CustomerId, LeadId, OpportunityId, FollowUpDate, FollowUpType, Subject, Remarks, Status, AssignedTo, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const result = stmt.run(
      data.CustomerId ? parseInt(data.CustomerId) : null,
      data.LeadId ? parseInt(data.LeadId) : null,
      data.OpportunityId ? parseInt(data.OpportunityId) : null,
      data.FollowUpDate,
      data.FollowUpType || 'Call',
      data.Subject.trim(),
      (data.Remarks || '').trim(),
      data.Status || 'Planned',
      data.AssignedTo || user.userId
    );

    const newId = result.lastInsertRowid;

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Create',
      entityName: 'FollowUp',
      recordId: String(newId),
      newValue: data,
      details: `Scheduled ${data.FollowUpType} follow-up "${data.Subject}" for ${data.FollowUpDate}.`,
      ipAddress
    });

    return newId;
  }

  static complete(id, remarks = '', user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    if (user.role === 'SalesExecutive' && current.AssignedTo !== user.userId) {
      return false;
    }

    const updatedRemarks = remarks ? (current.Remarks ? `${current.Remarks} | Completion Notes: ${remarks}` : remarks) : current.Remarks;

    db.prepare(`
      UPDATE FollowUps
      SET Status = 'Completed', Remarks = ?, CompletedDate = datetime('now', 'localtime')
      WHERE FollowUpId = ?
    `).run(updatedRemarks, id);

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Update',
      entityName: 'FollowUp',
      recordId: String(id),
      details: `Marked follow-up "${current.Subject}" as Completed.`,
      ipAddress
    });

    return true;
  }

  static reschedule(id, newDate, reason = '', user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    if (user.role === 'SalesExecutive' && current.AssignedTo !== user.userId) {
      return false;
    }

    const updatedRemarks = reason ? (current.Remarks ? `${current.Remarks} | Rescheduled: ${reason}` : reason) : current.Remarks;

    db.prepare(`
      UPDATE FollowUps
      SET FollowUpDate = ?, Status = 'Planned', Remarks = ?
      WHERE FollowUpId = ?
    `).run(newDate, updatedRemarks, id);

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Update',
      entityName: 'FollowUp',
      recordId: String(id),
      details: `Rescheduled follow-up "${current.Subject}" to ${newDate}. Reason: ${reason || 'Not specified'}.`,
      ipAddress
    });

    return true;
  }

  static delete(id, user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    if (user.role === 'SalesExecutive' && current.AssignedTo !== user.userId) {
      return false;
    }

    db.prepare('DELETE FROM FollowUps WHERE FollowUpId = ?').run(id);

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Delete',
      entityName: 'FollowUp',
      recordId: String(id),
      oldValue: current,
      details: `Deleted follow-up "${current.Subject}".`,
      ipAddress
    });

    return true;
  }
}

module.exports = FollowUp;
