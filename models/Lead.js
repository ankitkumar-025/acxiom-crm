const { db } = require('../config/database');
const AuditService = require('../services/auditService');

class Lead {
  static generateLeadCode() {
    const last = db.prepare('SELECT LeadId FROM Leads ORDER BY LeadId DESC LIMIT 1').get();
    const nextId = (last ? last.LeadId : 0) + 1;
    return `LEAD-${2000 + nextId}`;
  }

  static getFiltered({ search = '', status = '', user = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT l.*, u.Name AS AssignedName
      FROM Leads l
      LEFT JOIN Users u ON l.AssignedTo = u.UserId
      WHERE 1=1
    `;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND l.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (status) {
      sql += ` AND l.Status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (l.LeadName LIKE ? OR l.Email LIKE ? OR l.Phone LIKE ? OR l.CompanyName LIKE ? OR l.LeadCode LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY l.LeadId DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  static getCount({ search = '', status = '', user = null } = {}) {
    let sql = `SELECT COUNT(*) AS count FROM Leads l WHERE 1=1`;
    const params = [];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND l.AssignedTo = ?`;
      params.push(user.userId);
    }

    if (status) {
      sql += ` AND l.Status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (l.LeadName LIKE ? OR l.Email LIKE ? OR l.Phone LIKE ? OR l.CompanyName LIKE ? OR l.LeadCode LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    return db.prepare(sql).get(...params).count;
  }

  static findById(id, user = null) {
    let sql = `
      SELECT l.*, u.Name AS AssignedName, u.Email AS AssignedEmail
      FROM Leads l
      LEFT JOIN Users u ON l.AssignedTo = u.UserId
      WHERE l.LeadId = ?
    `;
    const params = [id];

    if (user && user.role === 'SalesExecutive') {
      sql += ` AND l.AssignedTo = ?`;
      params.push(user.userId);
    }

    return db.prepare(sql).get(...params);
  }

  static create(data, user, ipAddress = '127.0.0.1') {
    const code = this.generateLeadCode();
    const stmt = db.prepare(`
      INSERT INTO Leads (LeadCode, LeadName, Email, Phone, CompanyName, Source, Status, Priority, ExpectedValue, Notes, AssignedTo, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const result = stmt.run(
      code,
      data.LeadName.trim(),
      data.Email.trim(),
      data.Phone.trim(),
      (data.CompanyName || '').trim(),
      data.Source || 'Website',
      data.Status || 'New',
      data.Priority || 'Medium',
      parseFloat(data.ExpectedValue) || 0,
      (data.Notes || '').trim(),
      data.AssignedTo || user.userId
    );

    const newId = result.lastInsertRowid;

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Create',
      entityName: 'Lead',
      recordId: String(newId),
      newValue: { ...data, LeadCode: code },
      details: `Created new lead "${data.LeadName}" (${code}).`,
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

    db.prepare(`
      UPDATE Leads
      SET LeadName = ?, Email = ?, Phone = ?, CompanyName = ?, Source = ?, Status = ?, Priority = ?, ExpectedValue = ?, Notes = ?, AssignedTo = ?
      WHERE LeadId = ?
    `).run(
      data.LeadName.trim(),
      data.Email.trim(),
      data.Phone.trim(),
      (data.CompanyName || '').trim(),
      data.Source || 'Website',
      data.Status || current.Status,
      data.Priority || 'Medium',
      parseFloat(data.ExpectedValue) || 0,
      (data.Notes || '').trim(),
      data.AssignedTo || current.AssignedTo,
      id
    );

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Update',
      entityName: 'Lead',
      recordId: String(id),
      oldValue: current,
      newValue: data,
      details: `Updated lead "${data.LeadName}".`,
      ipAddress
    });

    return true;
  }

  /**
   * Complete Lead-to-Customer conversion workflow
   * Converts Lead -> Creates Customer -> Optionally Creates Opportunity -> Marks Lead as 'Converted'
   */
  static convertLead(leadId, { createOpportunity = true, opportunityAmount = null, expectedCloseDate = null, notes = '' } = {}, user, ipAddress = '127.0.0.1') {
    const lead = this.findById(leadId);
    if (!lead) return { success: false, message: 'Lead not found.' };

    if (lead.Status === 'Converted') {
      return { success: false, message: 'This lead has already been converted.' };
    }

    const Customer = require('./Customer');
    const Opportunity = require('./Opportunity');

    // Execute atomic transaction
    const transaction = db.transaction(() => {
      // 1. Create Customer record from lead details (or find if email already exists)
      let customerId = null;
      const existingCustomer = db.prepare('SELECT CustomerId FROM Customers WHERE Email = ?').get(lead.Email);

      if (existingCustomer) {
        customerId = existingCustomer.CustomerId;
      } else {
        customerId = Customer.create({
          CustomerName: lead.CompanyName || lead.LeadName,
          Email: lead.Email,
          Phone: lead.Phone,
          CompanyName: lead.CompanyName || lead.LeadName,
          Address: '',
          City: '',
          State: '',
          Status: 'Active',
          CreatedBy: lead.AssignedTo || user.userId
        }, user, ipAddress);
      }

      // 2. Optionally Create Opportunity
      let oppId = null;
      if (createOpportunity) {
        const amount = parseFloat(opportunityAmount) || lead.ExpectedValue || 50000;
        const closeDate = expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        oppId = Opportunity.create({
          OpportunityName: `${lead.LeadName} - Opportunity`,
          CustomerId: customerId,
          LeadId: lead.LeadId,
          Amount: amount,
          Stage: 'Qualification',
          Probability: 25,
          ExpectedCloseDate: closeDate,
          Notes: notes || `Generated from converted lead ${lead.LeadCode}.`,
          AssignedTo: lead.AssignedTo || user.userId
        }, user, ipAddress);
      }

      // 3. Update Lead status to 'Converted'
      db.prepare(`
        UPDATE Leads
        SET Status = 'Converted', ConvertedCustomerId = ?, ConvertedOpportunityId = ?
        WHERE LeadId = ?
      `).run(customerId, oppId, lead.LeadId);

      // 4. Log conversion event
      AuditService.log({
        userId: user.userId,
        userEmail: user.email,
        action: 'Lead Conversion',
        entityName: 'Lead',
        recordId: String(lead.LeadId),
        details: `Converted lead "${lead.LeadName}" (${lead.LeadCode}) to Customer ID ${customerId} and Opportunity ID ${oppId || 'N/A'}.`,
        ipAddress
      });

      return { customerId, oppId };
    });

    const result = transaction();
    return {
      success: true,
      customerId: result.customerId,
      opportunityId: result.oppId
    };
  }

  static delete(id, user, ipAddress = '127.0.0.1') {
    const current = this.findById(id);
    if (!current) return false;

    if (user.role === 'SalesExecutive' && current.AssignedTo !== user.userId) {
      return false;
    }

    db.prepare('DELETE FROM Leads WHERE LeadId = ?').run(id);

    AuditService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'Delete',
      entityName: 'Lead',
      recordId: String(id),
      oldValue: current,
      details: `Deleted lead "${current.LeadName}" (${current.LeadCode}).`,
      ipAddress
    });

    return true;
  }
}

module.exports = Lead;
