const FollowUp = require('../models/FollowUp');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Validator = require('../middleware/validation');

class FollowUpController {
  static index(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const followUps = FollowUp.getFiltered({ status, search, user: req.user, limit, offset });
    const totalCount = FollowUp.getCount({ status, search, user: req.user });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Counts for tabs
    const upcomingCount = FollowUp.getCount({ status: 'Upcoming', user: req.user });
    const overdueCount = FollowUp.getCount({ status: 'Overdue', user: req.user });
    const completedCount = FollowUp.getCount({ status: 'Completed', user: req.user });

    res.render('followups/index', {
      title: 'Follow-Up Schedule - AcxiomCRM',
      followUps,
      search,
      status,
      upcomingCount,
      overdueCount,
      completedCount,
      currentPage: page,
      totalPages,
      totalCount,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static create(req, res) {
    const customers = Customer.getFiltered({ user: req.user, limit: 100 });
    const leads = Lead.getFiltered({ user: req.user, limit: 100 });
    const salesUsers = User.getSalesExecutives();

    res.render('followups/create', {
      title: 'Schedule Follow-Up - AcxiomCRM',
      customers,
      leads,
      salesUsers,
      customerId: req.query.customerId || '',
      leadId: req.query.leadId || '',
      errors: [],
      data: {
        CustomerId: req.query.customerId || '',
        LeadId: req.query.leadId || '',
        FollowUpDate: new Date().toISOString().split('T')[0]
      }
    });
  }

  static store(req, res) {
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateFollowUp(req.body, true);

    if (errors.length > 0) {
      const customers = Customer.getFiltered({ user: req.user, limit: 100 });
      const leads = Lead.getFiltered({ user: req.user, limit: 100 });
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('followups/create', {
        title: 'Schedule Follow-Up - AcxiomCRM',
        customers,
        leads,
        salesUsers,
        customerId: req.body.CustomerId,
        leadId: req.body.LeadId,
        errors,
        data: req.body
      });
    }

    try {
      FollowUp.create(req.body, req.user, ipAddress);
      res.redirect('/followups?success=' + encodeURIComponent('Follow-up scheduled successfully.'));
    } catch (err) {
      const customers = Customer.getFiltered({ user: req.user, limit: 100 });
      const leads = Lead.getFiltered({ user: req.user, limit: 100 });
      const salesUsers = User.getSalesExecutives();
      res.status(500).render('followups/create', {
        title: 'Schedule Follow-Up - AcxiomCRM',
        customers,
        leads,
        salesUsers,
        customerId: req.body.CustomerId,
        leadId: req.body.LeadId,
        errors: ['Failed to schedule follow-up: ' + err.message],
        data: req.body
      });
    }
  }

  static complete(req, res) {
    const id = req.params.id;
    const remarks = req.body.remarks || '';
    const ipAddress = req.ip || '127.0.0.1';

    const success = FollowUp.complete(id, remarks, req.user, ipAddress);
    if (!success) {
      return res.redirect('/followups?error=' + encodeURIComponent('Unable to mark follow-up as completed.'));
    }

    res.redirect('/followups?success=' + encodeURIComponent('Follow-up marked as Completed.'));
  }

  static reschedule(req, res) {
    const id = req.params.id;
    const { newDate, reason } = req.body;
    const ipAddress = req.ip || '127.0.0.1';

    if (!newDate || !Validator.isDateTodayOrFuture(newDate)) {
      return res.redirect('/followups?error=' + encodeURIComponent('Reschedule date cannot be in the past.'));
    }

    const success = FollowUp.reschedule(id, newDate, reason, req.user, ipAddress);
    if (!success) {
      return res.redirect('/followups?error=' + encodeURIComponent('Unable to reschedule follow-up.'));
    }

    res.redirect('/followups?success=' + encodeURIComponent(`Follow-up rescheduled to ${newDate}.`));
  }

  static delete(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const success = FollowUp.delete(id, req.user, ipAddress);

    if (!success) {
      return res.redirect('/followups?error=' + encodeURIComponent('Unable to delete follow-up.'));
    }

    res.redirect('/followups?success=' + encodeURIComponent('Follow-up removed.'));
  }
}

module.exports = FollowUpController;
