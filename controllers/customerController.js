const Customer = require('../models/Customer');
const User = require('../models/User');
const Validator = require('../middleware/validation');
const { db } = require('../config/database');

class CustomerController {
  static index(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const customers = Customer.getFiltered({ search, status, user: req.user, limit, offset });
    const totalCount = Customer.getCount({ search, status, user: req.user });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render('customers/index', {
      title: 'Customer Management - AcxiomCRM',
      customers,
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
    res.render('customers/create', {
      title: 'Create New Customer - AcxiomCRM',
      salesUsers,
      errors: [],
      data: {}
    });
  }

  static store(req, res) {
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateCustomer(req.body, db);

    if (errors.length > 0) {
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('customers/create', {
        title: 'Create New Customer - AcxiomCRM',
        salesUsers,
        errors,
        data: req.body
      });
    }

    try {
      const customerId = Customer.create(req.body, req.user, ipAddress);
      res.redirect(`/customers/${customerId}?success=` + encodeURIComponent('Customer created successfully.'));
    } catch (err) {
      const salesUsers = User.getSalesExecutives();
      res.status(500).render('customers/create', {
        title: 'Create New Customer - AcxiomCRM',
        salesUsers,
        errors: ['Failed to save customer: ' + err.message],
        data: req.body
      });
    }
  }

  static details(req, res) {
    const customer = Customer.findById(req.params.id, req.user);
    if (!customer) {
      return res.status(404).render('errors/404', { title: 'Customer Not Found', message: 'The requested customer does not exist or you do not have permission to view it.' });
    }

    const history = Customer.getCustomerHistory(customer.CustomerId);

    res.render('customers/details', {
      title: `${customer.CustomerName} - Details`,
      customer,
      history,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static edit(req, res) {
    const customer = Customer.findById(req.params.id, req.user);
    if (!customer) {
      return res.status(404).render('errors/404', { title: 'Customer Not Found', message: 'Customer not found.' });
    }

    const salesUsers = User.getSalesExecutives();
    res.render('customers/edit', {
      title: `Edit Customer - ${customer.CustomerName}`,
      customer,
      salesUsers,
      errors: []
    });
  }

  static update(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const errors = Validator.validateCustomer(req.body, db, id);

    if (errors.length > 0) {
      const customer = Customer.findById(id, req.user);
      const salesUsers = User.getSalesExecutives();
      return res.status(400).render('customers/edit', {
        title: `Edit Customer - ${req.body.CustomerName || 'Customer'}`,
        customer: { ...customer, ...req.body },
        salesUsers,
        errors
      });
    }

    const success = Customer.update(id, req.body, req.user, ipAddress);
    if (!success) {
      return res.status(403).render('errors/403', { title: 'Permission Denied', message: 'You are not authorized to update this customer.' });
    }

    res.redirect(`/customers/${id}?success=` + encodeURIComponent('Customer details updated successfully.'));
  }

  static delete(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const success = Customer.delete(id, req.user, ipAddress);

    if (!success) {
      return res.redirect('/customers?error=' + encodeURIComponent('Unable to delete customer or permission denied.'));
    }

    res.redirect('/customers?success=' + encodeURIComponent('Customer removed successfully.'));
  }
}

module.exports = CustomerController;
