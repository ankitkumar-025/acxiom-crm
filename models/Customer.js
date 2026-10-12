const { db } = require('../config/database');
const AuditService = require('../services/auditService');

class Customer {
  static generateCustomerCode() {
    const last = db.prepare('SELECT CustomerId FROM Customers ORDER BY CustomerId DESC LIMIT 1').get();
    const nextId = (last ? last.CustomerId : 0) + 1;
    return `CUST-${1000 + nextId}`;
  }

  static getFiltered({ search = '', status = '', user = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT c.*, u.Name AS OwnerName,
        (SELECT COUNT(*) FROM Opportunities WHERE CustomerId = c.CustomerId) AS OpportunityCount,
        (SELECT COUNT(*) FROM FollowUps WHERE CustomerId = c.CustomerId) AS FollowUpCount
      FROM Customers c
      LEFT JOIN Users u ON c.CreatedBy = u.UserId
      WHERE 1=1
    `;
    const params = [];

    // Role-based scoping: SalesExecutive only sees own customers
    if (user && user.role === 'SalesExecutive') {
      sql += ` AND c.CreatedBy = ?`;
      params.push(user.userId);
    }

    if (status) {
      sql += ` AND c.Status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (c.CustomerName LIKE ? OR c.Email LIKE ? OR c.Phone LIKE ? OR c.CompanyName LIKE ? OR c.CustomerCode LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY c.CustomerId DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  static getCount({ search = '', status = '', user = null } = {}) {
    let sql = `SELECT COUNT(*) AS count FROM Customers c WHERE 1=1`;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND c.CreatedBy = ?`;
      params.push(user.userId);
    }

    if (status) {
      sql += ` AND c.Status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (c.CustomerName LIKE ? OR c.Email LIKE ? OR c.Phone LIKE ? OR c.CompanyName LIKE ? OR c.CustomerCode LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    return db.prepare(sql).get(...params).count;
  }

  static findById(id, user = null) {
    let sql = `
      SELECT c.*, u.Name AS OwnerName, u.Email AS OwnerEmail
      FROM Customers c
      LEFT JOIN Users u ON c.CreatedBy = u.UserId
      WHERE c.CustomerId = ?
    `;
    const params = [id];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND c.CreatedBy = ?`;
      params.push(user.userId);
    }

    return db.prepare(sql).get(...params);
  }

  /**
   * Get complete customer activity timeline history (Opportunities, Follow-Ups, Activities, Leads)
   */
  static getCustomerHistory(customerId) {
    const opportunities = db.prepare('SELECT * FROM Opportunities WHERE CustomerId = ? ORDER BY CreatedDate DESC').all(customerId);
    const followUps = db.prepare('SELECT f.*, u.Name AS AssignedName FROM FollowUps f LEFT JOIN Users u ON f.AssignedTo = u.UserId WHERE CustomerId = ? ORDER BY FollowUpDate DESC').all(customerId);
    const activities = db.prepare('SELECT a.*, u.Name AS AssignedName FROM Activities a LEFT JOIN Users u ON a.AssignedTo = u.UserId WHERE CustomerId = ? ORDER BY ActivityDate DESC').all(customerId);
    const leads = db.prepare('SELECT * FROM Leads WHERE ConvertedCustomerId = ?').all(customerId);

    return {
      opportunities,
      followUps,
      activities,
      leads
    };
  }

  static create(data, user, ipAddress = '127.0.0.1') {
    const code = this.generateCustomerCode();
    const stmt = db.prepare(`
      INSERT INTO Customers (CustomerCode, CustomerName, Email, Phone, CompanyName, Address, City, State, Status, CreatedBy, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const result = stmt.run(
      code,
      data.CustomerName.trim(),
      data.Email.trim(),
      data.Phone.trim(),
      (data.CompanyName || '').trim(),
      (data.Address || '').trim(),
      (data.City || '').trim(),
      (data.State || '').trim(),
      data.Status || 'Active',
      data.CreatedBy || user.userId
    );

    const newId = result.lastInsertRowid;

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Create',
      entityName: 'Customer',
      recordId: String(newId),
      newValue: { ...data, CustomerCode: code },
      details: `Created new customer "${data.CustomerName}" (${code}).`,
      ipAddress
    });

    return newId;
  }

  static update(id, data, user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    // Check ownership if SalesExecutive
    if (user.role === 'SalesExecutive' && current.CreatedBy !== user.userId) {
      return false;
    }

    db.prepare(`
      UPDATE Customers
      SET CustomerName = ?, Email = ?, Phone = ?, CompanyName = ?, Address = ?, City = ?, State = ?, Status = ?, CreatedBy = ?
      WHERE CustomerId = ?
    `).run(
      data.CustomerName.trim(),
      data.Email.trim(),
      data.Phone.trim(),
      (data.CompanyName || '').trim(),
      (data.Address || '').trim(),
      (data.City || '').trim(),
      (data.State || '').trim(),
      data.Status || 'Active',
      data.CreatedBy || current.CreatedBy,
      id
    );

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Update',
      entityName: 'Customer',
      recordId: String(id),
      oldValue: current,
      newValue: data,
      details: `Updated customer "${data.CustomerName}".`,
      ipAddress
    });

    return true;
  }

  static delete(id, user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    if (user.role === 'SalesExecutive' && current.CreatedBy !== user.userId) {
      return false;
    }

    db.prepare('DELETE FROM Customers WHERE CustomerId = ?').run(id);

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Delete',
      entityName: 'Customer',
      recordId: String(id),
      oldValue: current,
      details: `Deleted customer "${current.CustomerName}" (${current.CustomerCode}).`,
      ipAddress
    });

    return true;
  }
}

module.exports = Customer;
