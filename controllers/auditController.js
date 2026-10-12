const AuditService = require('../services/auditService');
const User = require('../models/User');

class AuditController {
  static index(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const userId = req.query.userId || null;
    const entityName = req.query.entityName || null;
    const action = req.query.action || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const logs = AuditService.getLogs({ userId, entityName, action, startDate, endDate, limit, offset });
    const totalCount = AuditService.getLogCount({ userId, entityName, action, startDate, endDate });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const users = User.getAllUsers();

    res.render('audit/index', {
      title: 'Audit Trail & Security Logs - AcxiomCRM',
      logs,
      users,
      userId,
      entityName,
      action,
      startDate,
      endDate,
      currentPage: page,
      totalPages,
      totalCount
    });
  }
}

module.exports = AuditController;
