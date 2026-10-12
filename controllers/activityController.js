const Activity = require('../models/Activity');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const User = require('../models/User');

class ActivityController {
  static index(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const type = req.query.type || '';
    const status = req.query.status || '';

    const activities = Activity.getFiltered({ type, status, user: req.user, limit, offset });
    const totalCount = Activity.getCount({ type, status, user: req.user });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const customers = Customer.getFiltered({ user: req.user, limit: 100 });
    const leads = Lead.getFiltered({ user: req.user, limit: 100 });

    res.render('activities/index', {
      title: 'Activity Log & Timeline - AcxiomCRM',
      activities,
      customers,
      leads,
      type,
      status,
      currentPage: page,
      totalPages,
      totalCount,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static store(req, res) {
    const ipAddress = req.ip || '127.0.0.1';
    const { Subject } = req.body;

    if (!Subject || !Subject.trim()) {
      return res.redirect('/activities?error=' + encodeURIComponent('Activity subject is required.'));
    }

    try {
      Activity.create(req.body, req.user, ipAddress);
      res.redirect('/activities?success=' + encodeURIComponent('Activity logged successfully.'));
    } catch (err) {
      res.redirect('/activities?error=' + encodeURIComponent('Failed to log activity: ' + err.message));
    }
  }
}

module.exports = ActivityController;
