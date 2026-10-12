const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const FollowUp = require('../models/FollowUp');
const ReportService = require('../services/reportService');
const Validator = require('../middleware/validation');
const { requireAuth, requireRole, generateToken } = require('../middleware/auth');
const { db } = require('../config/database');

// ==========================================
// 1. Authentication Endpoints
// ==========================================

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || '127.0.0.1';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const result = User.authenticate(email, password, ipAddress);
  if (!result.success) {
    const statusCode = result.isLocked ? 403 : 401;
    return res.status(statusCode).json({ success: false, message: result.message });
  }

  const token = generateToken(result.user);
  res.status(200).json({
    success: true,
    message: 'Authentication successful.',
    token,
    user: {
      userId: result.user.UserId,
      name: result.user.Name,
      email: result.user.Email,
      role: result.user.Role
    }
  });
});

// POST /api/auth/logout
router.post('/auth/logout', requireAuth, (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// 2. Customer Endpoints
// ==========================================

// GET /api/customers
router.get('/customers', requireAuth, (req, res) => {
  const search = req.query.search || '';
  const status = req.query.status || '';
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const customers = Customer.getFiltered({ search, status, user: req.user, limit, offset });
  const count = Customer.getCount({ search, status, user: req.user });

  // Map to DTO (Never expose internal or sensitive fields)
  const dtos = customers.map(c => ({
    customerId: c.CustomerId,
    customerCode: c.CustomerCode,
    customerName: c.CustomerName,
    email: c.Email,
    phone: c.Phone,
    companyName: c.CompanyName,
    city: c.City,
    state: c.State,
    status: c.Status,
    ownerName: c.OwnerName,
    createdDate: c.CreatedDate
  }));

  res.status(200).json({ success: true, count, data: dtos });
});

// GET /api/customers/:id
router.get('/customers/:id', requireAuth, (req, res) => {
  const customer = Customer.findById(req.params.id, req.user);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const dto = {
    customerId: customer.CustomerId,
    customerCode: customer.CustomerCode,
    customerName: customer.CustomerName,
    email: customer.Email,
    phone: customer.Phone,
    companyName: customer.CompanyName,
    address: customer.Address,
    city: customer.City,
    state: customer.State,
    status: customer.Status,
    ownerName: customer.OwnerName,
    ownerEmail: customer.OwnerEmail,
    createdDate: customer.CreatedDate
  };

  res.status(200).json({ success: true, data: dto });
});

// POST /api/customers
router.post('/customers', requireAuth, (req, res) => {
  const errors = Validator.validateCustomer(req.body, db);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const id = Customer.create(req.body, req.user, req.ip);
    const created = Customer.findById(id, req.user);
    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: created
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:id
router.put('/customers/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const existing = Customer.findById(id, req.user);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const errors = Validator.validateCustomer(req.body, db, id);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const success = Customer.update(id, req.body, req.user, req.ip);
  if (!success) {
    return res.status(403).json({ success: false, message: 'Access denied to update customer.' });
  }

  const updated = Customer.findById(id, req.user);
  res.status(200).json({ success: true, message: 'Customer updated successfully.', data: updated });
});

// DELETE /api/customers/:id
router.delete('/customers/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const existing = Customer.findById(id, req.user);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const success = Customer.delete(id, req.user, req.ip);
  if (!success) {
    return res.status(403).json({ success: false, message: 'Access denied to delete customer.' });
  }

  res.status(200).json({ success: true, message: 'Customer deleted successfully.' });
});

// ==========================================
// 3. Lead Endpoints
// ==========================================

// GET /api/leads
router.get('/leads', requireAuth, (req, res) => {
  const search = req.query.search || '';
  const status = req.query.status || '';
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const leads = Lead.getFiltered({ search, status, user: req.user, limit, offset });
  const count = Lead.getCount({ search, status, user: req.user });

  const dtos = leads.map(l => ({
    leadId: l.LeadId,
    leadCode: l.LeadCode,
    leadName: l.LeadName,
    email: l.Email,
    phone: l.Phone,
    companyName: l.CompanyName,
    source: l.Source,
    status: l.Status,
    priority: l.Priority,
    expectedValue: l.ExpectedValue,
    assignedName: l.AssignedName,
    createdDate: l.CreatedDate
  }));

  res.status(200).json({ success: true, count, data: dtos });
});

// GET /api/leads/:id
router.get('/leads/:id', requireAuth, (req, res) => {
  const lead = Lead.findById(req.params.id, req.user);
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }
  res.status(200).json({ success: true, data: lead });
});

// POST /api/leads
router.post('/leads', requireAuth, (req, res) => {
  const errors = Validator.validateLead(req.body, db);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const id = Lead.create(req.body, req.user, req.ip);
    const created = Lead.findById(id, req.user);
    res.status(201).json({ success: true, message: 'Lead created successfully.', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/leads/:id
router.put('/leads/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const existing = Lead.findById(id, req.user);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  const errors = Validator.validateLead(req.body, db, id);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const success = Lead.update(id, req.body, req.user, req.ip);
  if (!success) {
    return res.status(403).json({ success: false, message: 'Access denied to update lead.' });
  }

  const updated = Lead.findById(id, req.user);
  res.status(200).json({ success: true, message: 'Lead updated successfully.', data: updated });
});

// DELETE /api/leads/:id
router.delete('/leads/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const existing = Lead.findById(id, req.user);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  const success = Lead.delete(id, req.user, req.ip);
  if (!success) {
    return res.status(403).json({ success: false, message: 'Access denied to delete lead.' });
  }

  res.status(200).json({ success: true, message: 'Lead deleted successfully.' });
});

// ==========================================
// 4. Opportunity Endpoints
// ==========================================

// GET /api/opportunities
router.get('/opportunities', requireAuth, (req, res) => {
  const search = req.query.search || '';
  const stage = req.query.stage || '';
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const opps = Opportunity.getFiltered({ search, stage, user: req.user, limit, offset });
  const count = Opportunity.getCount({ search, stage, user: req.user });

  const dtos = opps.map(o => ({
    opportunityId: o.OpportunityId,
    opportunityName: o.OpportunityName,
    customerId: o.CustomerId,
    customerName: o.CustomerName,
    amount: o.Amount,
    stage: o.Stage,
    probability: o.Probability,
    weightedAmount: o.WeightedAmount,
    expectedCloseDate: o.ExpectedCloseDate,
    status: o.Status,
    assignedName: o.AssignedName,
    createdDate: o.CreatedDate
  }));

  res.status(200).json({ success: true, count, data: dtos });
});

// GET /api/opportunities/:id
router.get('/opportunities/:id', requireAuth, (req, res) => {
  const opp = Opportunity.findById(req.params.id, req.user);
  if (!opp) {
    return res.status(404).json({ success: false, message: 'Opportunity not found.' });
  }
  res.status(200).json({ success: true, data: opp });
});

// POST /api/opportunities
router.post('/opportunities', requireAuth, (req, res) => {
  const errors = Validator.validateOpportunity(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const id = Opportunity.create(req.body, req.user, req.ip);
    const created = Opportunity.findById(id, req.user);
    res.status(201).json({ success: true, message: 'Opportunity created successfully.', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/opportunities/:id
router.put('/opportunities/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const existing = Opportunity.findById(id, req.user);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Opportunity not found.' });
  }

  const errors = Validator.validateOpportunity(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const success = Opportunity.update(id, req.body, req.user, req.ip);
  if (!success) {
    return res.status(403).json({ success: false, message: 'Access denied to update opportunity.' });
  }

  const updated = Opportunity.findById(id, req.user);
  res.status(200).json({ success: true, message: 'Opportunity updated successfully.', data: updated });
});

// DELETE /api/opportunities/:id
router.delete('/opportunities/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const existing = Opportunity.findById(id, req.user);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Opportunity not found.' });
  }

  const success = Opportunity.delete(id, req.user, req.ip);
  if (!success) {
    return res.status(403).json({ success: false, message: 'Access denied to delete opportunity.' });
  }

  res.status(200).json({ success: true, message: 'Opportunity deleted successfully.' });
});

// ==========================================
// 5. Follow-Up Endpoints
// ==========================================

// GET /api/followups
router.get('/followups', requireAuth, (req, res) => {
  const status = req.query.status || '';
  const search = req.query.search || '';
  const followUps = FollowUp.getFiltered({ status, search, user: req.user, limit: 100 });
  res.status(200).json({ success: true, count: followUps.length, data: followUps });
});

// POST /api/followups
router.post('/followups', requireAuth, (req, res) => {
  const errors = Validator.validateFollowUp(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const id = FollowUp.create(req.body, req.user, req.ip);
    const created = FollowUp.findById(id, req.user);
    res.status(201).json({ success: true, message: 'Follow-up created successfully.', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. Reports Pipeline Endpoint
// ==========================================

// GET /api/reports/pipeline
router.get('/reports/pipeline', requireAuth, requireRole('Admin', 'Manager'), (req, res) => {
  const pipeline = ReportService.getPipelineReport(req.user);
  res.status(200).json({ success: true, data: pipeline });
});

module.exports = router;
