const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Validator = require('../middleware/validation');

class OpportunityController {
  static index(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const stage = req.query.stage || '';

    const opportunities = Opportunity.getFiltered({ search, stage, user: req.user, limit, offset });
    const totalCount = Opportunity.getCount({ search, stage, user: req.user });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Summary calculations
    const totalPipelineAmount = opportunities.reduce((acc, o) => acc + (o.Status === 'Open' ? o.Amount : 0), 0);
    const totalWeightedAmount = opportunities.reduce((acc, o) => acc + (o.Status === 'Open' ? o.WeightedAmount : 0), 0);

    res.render('opportunities/index', {
      title: 'Opportunity & Pipeline Management - AcxiomCRM',
      opportunities,
      search,
      stage,
      totalPipelineAmount,
      totalWeightedAmount,
      currentPage: page,
      totalPages,
      totalCount,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static create(req, res) {
    const customers = Customer.getFiltered({ user: req.user, limit: 100 });
    const salesUsers = User.getSalesExecutives();
    const customerId = req.query.customerId || '';

    res.render('opportunities/create', {
      title: 'Create Sales Opportunity - AcxiomCRM',
      customers,
      salesUsers,
      customerId,
      errors: [],
      data: { CustomerId: customerId }
    });
  }

  static store(req, res) {
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateOpportunity(req.body);

    if (errors.length > 0) {
      const customers = Customer.getFiltered({ user: req.user, limit: 100 });
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('opportunities/create', {
        title: 'Create Sales Opportunity - AcxiomCRM',
        customers,
        salesUsers,
        customerId: req.body.CustomerId,
        errors,
        data: req.body
      });
    }

    try {
      const oppId = Opportunity.create(req.body, req.user, ipAddress);
      res.redirect(`/opportunities/${oppId}?success=` + encodeURIComponent('Opportunity created successfully.'));
    } catch (err) {
      const customers = Customer.getFiltered({ user: req.user, limit: 100 });
      const salesUsers = User.getSalesExecutives();
      res.status(500).render('opportunities/create', {
        title: 'Create Sales Opportunity - AcxiomCRM',
        customers,
        salesUsers,
        customerId: req.body.CustomerId,
        errors: ['Failed to save opportunity: ' + err.message],
        data: req.body
      });
    }
  }

  static details(req, res) {
    const opportunity = Opportunity.findById(req.params.id, req.user);
    if (!opportunity) {
      return res.status(404).render('errors/404', { title: 'Opportunity Not Found', message: 'The requested opportunity does not exist or access is denied.' });
    }

    res.render('opportunities/details', {
      title: `${opportunity.OpportunityName} - Details`,
      opportunity,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static edit(req, res) {
    const opportunity = Opportunity.findById(req.params.id, req.user);
    if (!opportunity) {
      return res.status(404).render('errors/404', { title: 'Opportunity Not Found', message: 'Opportunity not found.' });
    }

    const customers = Customer.getFiltered({ user: req.user, limit: 100 });
    const salesUsers = User.getSalesExecutives();

    res.render('opportunities/edit', {
      title: `Edit Opportunity - ${opportunity.OpportunityName}`,
      opportunity,
      customers,
      salesUsers,
      errors: []
    });
  }

  static update(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateOpportunity(req.body);

    if (errors.length > 0) {
      const opportunity = Opportunity.findById(id, req.user);
      const customers = Customer.getFiltered({ user: req.user, limit: 100 });
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('opportunities/edit', {
        title: `Edit Opportunity - ${req.body.OpportunityName || 'Opportunity'}`,
        opportunity: { ...opportunity, ...req.body },
        customers,
        salesUsers,
        errors
      });
    }

    const success = Opportunity.update(id, req.body, req.user, ipAddress);
    if (!success) {
      return res.status(403).render('errors/403', { title: 'Permission Denied', message: 'You are not authorized to update this opportunity.' });
    }

    res.redirect(`/opportunities/${id}?success=` + encodeURIComponent('Opportunity updated successfully.'));
  }

  static delete(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const success = Opportunity.delete(id, req.user, ipAddress);

    if (!success) {
      return res.redirect('/opportunities?error=' + encodeURIComponent('Unable to delete opportunity or permission denied.'));
    }

    res.redirect('/opportunities?success=' + encodeURIComponent('Opportunity removed successfully.'));
  }
}

module.exports = OpportunityController;
