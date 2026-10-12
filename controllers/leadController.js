const Lead = require('../models/Lead');
const User = require('../models/User');
const Validator = require('../middleware/validation');
const { db } = require('../config/database');

class LeadController {
  static index(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const leads = Lead.getFiltered({ search, status, user: req.user, limit, offset });
    const totalCount = Lead.getCount({ search, status, user: req.user });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render('leads/index', {
      title: 'Lead Management - AcxiomCRM',
      leads,
      search,
      status,
      currentPage: page,
      totalPages,
      totalCount,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static create(req, res) {
    const salesUsers = User.getSalesExecutives();
    res.render('leads/create', {
      title: 'Create New Lead - AcxiomCRM',
      salesUsers,
      errors: [],
      data: {}
    });
  }

  static store(req, res) {
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateLead(req.body, db);

    if (errors.length > 0) {
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('leads/create', {
        title: 'Create New Lead - AcxiomCRM',
        salesUsers,
        errors,
        data: req.body
      });
    }

    try {
      const leadId = Lead.create(req.body, req.user, ipAddress);
      res.redirect(`/leads/${leadId}?success=` + encodeURIComponent('Lead created successfully.'));
    } catch (err) {
      const salesUsers = User.getSalesExecutives();
      res.status(500).render('leads/create', {
        title: 'Create New Lead - AcxiomCRM',
        salesUsers,
        errors: ['Failed to save lead: ' + err.message],
        data: req.body
      });
    }
  }

  static details(req, res) {
    const lead = Lead.findById(req.params.id, req.user);
    if (!lead) {
      return res.status(404).render('errors/404', { title: 'Lead Not Found', message: 'The requested lead does not exist or access is denied.' });
    }

    res.render('leads/details', {
      title: `${lead.LeadName} - Lead Details`,
      lead,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static edit(req, res) {
    const lead = Lead.findById(req.params.id, req.user);
    if (!lead) {
      return res.status(404).render('errors/404', { title: 'Lead Not Found', message: 'Lead not found.' });
    }

    const salesUsers = User.getSalesExecutives();
    res.render('leads/edit', {
      title: `Edit Lead - ${lead.LeadName}`,
      lead,
      salesUsers,
      errors: []
    });
  }

  static update(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateLead(req.body, db, id);

    if (errors.length > 0) {
      const lead = Lead.findById(id, req.user);
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('leads/edit', {
        title: `Edit Lead - ${req.body.LeadName || 'Lead'}`,
        lead: { ...lead, ...req.body },
        salesUsers,
        errors
      });
    }

    const success = Lead.update(id, req.body, req.user, ipAddress);
    if (!success) {
      return res.status(403).render('errors/403', { title: 'Permission Denied', message: 'You are not authorized to update this lead.' });
    }

    res.redirect(`/leads/${id}?success=` + encodeURIComponent('Lead updated successfully.'));
  }

  static showConvert(req, res) {
    const lead = Lead.findById(req.params.id, req.user);
    if (!lead) {
      return res.status(404).render('errors/404', { title: 'Lead Not Found', message: 'Lead not found.' });
    }

    if (lead.Status === 'Converted') {
      return res.redirect(`/leads/${lead.LeadId}?error=` + encodeURIComponent('This lead has already been converted.'));
    }

    res.render('leads/convert', {
      title: `Convert Lead - ${lead.LeadName}`,
      lead,
      errors: []
    });
  }

  static convert(req, res) {
    const leadId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const { createOpportunity, opportunityAmount, expectedCloseDate, notes } = req.body;

    const result = Lead.convertLead(
      leadId,
      {
        createOpportunity: createOpportunity === 'on' || createOpportunity === 'true',
        opportunityAmount,
        expectedCloseDate,
        notes
      },
      req.user,
      ipAddress
    );

    if (!result.success) {
      return res.redirect(`/leads/${leadId}?error=` + encodeURIComponent(result.message));
    }

    res.redirect(`/customers/${result.customerId}?success=` + encodeURIComponent('Lead successfully converted to Customer and Sales Opportunity!'));
  }

  static delete(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const success = Lead.delete(id, req.user, ipAddress);

    if (!success) {
      return res.redirect('/leads?error=' + encodeURIComponent('Unable to delete lead or permission denied.'));
    }

    res.redirect('/leads?success=' + encodeURIComponent('Lead deleted successfully.'));
  }
}

module.exports = LeadController;
