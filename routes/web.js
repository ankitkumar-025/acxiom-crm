const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const DashboardController = require('../controllers/dashboardController');
const CustomerController = require('../controllers/customerController');
const LeadController = require('../controllers/leadController');
const OpportunityController = require('../controllers/opportunityController');
const FollowUpController = require('../controllers/followUpController');
const ActivityController = require('../controllers/activityController');
const UserController = require('../controllers/userController');
const AuditController = require('../controllers/auditController');
const ReportController = require('../controllers/reportController');

const { requireAuth, requireRole } = require('../middleware/auth');

// ==========================================
// Authentication Routes (Public)
// ==========================================
router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);

router.get('/register', AuthController.showRegister);
router.post('/register', AuthController.register);

router.all('/logout', AuthController.logout);

// Root redirect
router.get('/', (req, res) => res.redirect('/dashboard'));

// Profile
router.get('/profile', requireAuth, AuthController.showProfile);
router.post('/profile/change-password', requireAuth, AuthController.changePassword);

// ==========================================
// Dashboard (Authenticated)
// ==========================================
router.get('/dashboard', requireAuth, DashboardController.index);

// ==========================================
// Customer Management (Authenticated)
// ==========================================
router.get('/customers', requireAuth, CustomerController.index);
router.get('/customers/create', requireAuth, CustomerController.create);
router.post('/customers/create', requireAuth, CustomerController.store);
router.get('/customers/:id', requireAuth, CustomerController.details);
router.get('/customers/:id/edit', requireAuth, CustomerController.edit);
router.post('/customers/:id/edit', requireAuth, CustomerController.update);
router.post('/customers/:id/delete', requireAuth, CustomerController.delete);

// ==========================================
// Lead Management (Authenticated)
// ==========================================
router.get('/leads', requireAuth, LeadController.index);
router.get('/leads/create', requireAuth, LeadController.create);
router.post('/leads/create', requireAuth, LeadController.store);
router.get('/leads/:id', requireAuth, LeadController.details);
router.get('/leads/:id/edit', requireAuth, LeadController.edit);
router.post('/leads/:id/edit', requireAuth, LeadController.update);
router.get('/leads/:id/convert', requireAuth, LeadController.showConvert);
router.post('/leads/:id/convert', requireAuth, LeadController.convert);
router.post('/leads/:id/delete', requireAuth, LeadController.delete);

// ==========================================
// Opportunity Management (Authenticated)
// ==========================================
router.get('/opportunities', requireAuth, OpportunityController.index);
router.get('/opportunities/create', requireAuth, OpportunityController.create);
router.post('/opportunities/create', requireAuth, OpportunityController.store);
router.get('/opportunities/:id', requireAuth, OpportunityController.details);
router.get('/opportunities/:id/edit', requireAuth, OpportunityController.edit);
router.post('/opportunities/:id/edit', requireAuth, OpportunityController.update);
router.post('/opportunities/:id/delete', requireAuth, OpportunityController.delete);

// ==========================================
// Follow-Up Management (Authenticated)
// ==========================================
router.get('/followups', requireAuth, FollowUpController.index);
router.get('/followups/create', requireAuth, FollowUpController.create);
router.post('/followups/create', requireAuth, FollowUpController.store);
router.post('/followups/:id/complete', requireAuth, FollowUpController.complete);
router.post('/followups/:id/reschedule', requireAuth, FollowUpController.reschedule);
router.post('/followups/:id/delete', requireAuth, FollowUpController.delete);

// ==========================================
// Activity Management (Authenticated)
// ==========================================
router.get('/activities', requireAuth, ActivityController.index);
router.post('/activities/create', requireAuth, ActivityController.store);

// ==========================================
// Reporting Hub (Authenticated)
// ==========================================
router.get('/reports', requireAuth, ReportController.index);
router.get('/reports/:type', requireAuth, ReportController.viewReport);
router.get('/reports/:type/export', requireAuth, ReportController.exportCSV);

// ==========================================
// Administration (Admin Only)
// ==========================================
router.get('/users', requireAuth, requireRole('Admin'), UserController.index);
router.get('/users/create', requireAuth, requireRole('Admin'), UserController.create);
router.post('/users/create', requireAuth, requireRole('Admin'), UserController.store);
router.post('/users/:id/toggle', requireAuth, requireRole('Admin'), UserController.toggleStatus);
router.post('/users/:id/unlock', requireAuth, requireRole('Admin'), UserController.unlock);
router.post('/users/:id/reset-password', requireAuth, requireRole('Admin'), UserController.resetPassword);

// Audit Trail (Admin & Manager)
router.get('/audit', requireAuth, requireRole('Admin', 'Manager'), AuditController.index);

module.exports = router;
