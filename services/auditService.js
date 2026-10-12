const { db } = require('../config/database');

class AuditService {
  /**
   * Log an event into the immutable AuditLogs table.
   */
  static log({ userId, userEmail, action, entityName, recordId, oldValue = null, newValue = null, details = null, ipAddress = '127.0.0.1' }) {
    try {
      const stmt = db.prepare(`
        INSERT INTO AuditLogs (UserId, UserEmail, Action, EntityName, RecordId, OldValue, NewValue, Details, IpAddress, CreatedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `);

      stmt.run(
        userId || null,
        userEmail || 'Anonymous',
        action,
        entityName,
        recordId ? String(recordId) : null,
        oldValue ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)) : null,
        newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : null,
        details || null,
        ipAddress || '127.0.0.1'
      );
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err.message);
    }
  }

  /**
   * Retrieve audit logs with flexible filtering
   */
  static getLogs({ userId = null, entityName = null, action = null, startDate = null, endDate = null, limit = 100, offset = 0 } = {}) {
    let sql = `SELECT * FROM AuditLogs WHERE 1=1`;
    const params = [];

    if (userId) {
      sql += ` AND UserId = ?`;
      params.push(userId);
    }
    if (entityName) {
      sql += ` AND EntityName = ?`;
      params.push(entityName);
    }
    if (action) {
      sql += ` AND Action = ?`;
      params.push(action);
    }
    if (startDate) {
      sql += ` AND date(CreatedDate) >= date(?)`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND date(CreatedDate) <= date(?)`;
      params.push(endDate);
    }

    sql += ` ORDER BY AuditLogId DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  static getLogCount({ userId = null, entityName = null, action = null, startDate = null, endDate = null } = {}) {
    let sql = `SELECT COUNT(*) AS count FROM AuditLogs WHERE 1=1`;
    const params = [];

    if (userId) {
      sql += ` AND UserId = ?`;
      params.push(userId);
    }
    if (entityName) {
      sql += ` AND EntityName = ?`;
      params.push(entityName);
    }
    if (action) {
      sql += ` AND Action = ?`;
      params.push(action);
    }
    if (startDate) {
      sql += ` AND date(CreatedDate) >= date(?)`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND date(CreatedDate) <= date(?)`;
      params.push(endDate);
    }

    return db.prepare(sql).get(...params).count;
  }
}

module.exports = AuditService;
