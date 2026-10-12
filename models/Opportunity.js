const { db } = require('../config/database');
const AuditService = require('../services/auditService');

class Opportunity {
  static getFiltered({ search = '', stage = '', user = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT o.*, c.CustomerName, c.CustomerCode, u.Name AS AssignedName,
        ROUND((o.Amount * o.Probability) / 100, 2) AS WeightedAmount
      FROM Opportunities o
      JOIN Customers c ON o.CustomerId = c.CustomerId
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND o.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (stage) {
      sql += ` AND o.Stage = ?`;
      params.push(stage);
    }

    if (search) {
      sql += ` AND (o.OpportunityName LIKE ? OR c.CustomerName LIKE ? OR o.Stage LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY o.OpportunityId DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  static getCount({ search = '', stage = '', user = null } = {}) {
    let sql = `
      SELECT COUNT(*) AS count
      FROM Opportunities o
      JOIN Customers c ON o.CustomerId = c.CustomerId
      WHERE 1=1
    `;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND o.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (stage) {
      sql += ` AND o.Stage = ?`;
      params.push(stage);
    }

    if (search) {
      sql += ` AND (o.OpportunityName LIKE ? OR c.CustomerName LIKE ? OR o.Stage LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    return db.prepare(sql).get(...params).count;
  }

  static findById(id, user = null) {
    let sql = `
      SELECT o.*, c.CustomerName, c.CustomerCode, c.Email AS CustomerEmail, c.Phone AS CustomerPhone,
        u.Name AS AssignedName,
        ROUND((o.Amount * o.Probability) / 100, 2) AS WeightedAmount
      FROM Opportunities o
      JOIN Customers c ON o.CustomerId = c.CustomerId
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE o.OpportunityId = ?
    `;
    const params = [id];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND o.AssignedTo = ?`;
      params.push(user.userId);
    }

    return db.prepare(sql).get(...params);
  }

  static create(data, user, ipAddress = '127.0.0.1') {
    const amount = parseFloat(data.Amount);
    const prob = parseInt(data.Probability);
    const stage = data.Stage || 'Qualification';
    
    // Auto-calculate Status based on Stage
    let status = 'Open';
    if (stage === 'Won') status = 'Won';
    if (stage === 'Lost') status = 'Lost';

    const stmt = db.prepare(`
      INSERT INTO Opportunities (OpportunityName, CustomerId, LeadId, Amount, Stage, Probability, ExpectedCloseDate, Status, Notes, AssignedTo, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const result = stmt.run(
      data.OpportunityName.trim(),
      parseInt(data.CustomerId),
      data.LeadId ? parseInt(data.LeadId) : null,
      amount,
      stage,
      prob,
      data.ExpectedCloseDate,
      status,
      (data.Notes || '').trim(),
      data.AssignedTo || user.userId
    );

    const newId = result.lastInsertRowid;

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Create',
      entityName: 'Opportunity',
      recordId: String(newId),
      newValue: { ...data, Status: status },
      details: `Created opportunity "${data.OpportunityName}" with amount $${amount} at stage ${stage}.`,
      ipAddress
    });

    return newId;
  }

  static update(id, data, user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    if (user.role === 'SalesExecutive' && current.AssignedTo !== user.userId) {
      return false;
    }

    const amount = parseFloat(data.Amount);
    const prob = parseInt(data.Probability);
    const stage = data.Stage || current.Stage;
    
    let status = 'Open';
    if (stage === 'Won') status = 'Won';
    if (stage === 'Lost') status = 'Lost';

    db.prepare(`
      UPDATE Opportunities
      SET OpportunityName = ?, CustomerId = ?, Amount = ?, Stage = ?, Probability = ?, ExpectedCloseDate = ?, Status = ?, Notes = ?, AssignedTo = ?
      WHERE OpportunityId = ?
    `).run(
      data.OpportunityName.trim(),
      parseInt(data.CustomerId),
      amount,
      stage,
      prob,
      data.ExpectedCloseDate,
      status,
      (data.Notes || '').trim(),
      data.AssignedTo || current.AssignedTo,
      id
    );

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Update',
      entityName: 'Opportunity',
      recordId: String(id),
      oldValue: current,
      newValue: { ...data, Status: status },
      details: `Updated opportunity "${data.OpportunityName}" to stage ${stage}.`,
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

    db.prepare('DELETE FROM Opportunities WHERE OpportunityId = ?').run(id);

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Delete',
      entityName: 'Opportunity',
      recordId: String(id),
      oldValue: current,
      details: `Deleted opportunity "${current.OpportunityName}".`,
      ipAddress
    });

    return true;
  }
}

module.exports = Opportunity;
