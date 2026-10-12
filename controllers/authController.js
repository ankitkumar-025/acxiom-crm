const User = require('../models/User');
const AuditService = require('../services/auditService');
const Validator = require('../middleware/validation');
const { generateToken } = require('../middleware/auth');

class AuthController {
  static showLogin(req, res) {
    if (req.user) {
      return res.redirect('/dashboard');
    }
    const returnUrl = req.query.returnUrl || '/dashboard';
    const error = req.query.error || null;
    res.render('auth/login', {
      title: 'Sign In - AcxiomCRM',
      returnUrl,
      error,
      layout: 'layouts/auth'
    });
  }

  static async login(req, res) {
    const { email, password, returnUrl = '/dashboard' } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Sign In - AcxiomCRM',
        returnUrl,
        error: 'Please provide both email and password.',
        layout: 'layouts/auth'
      });
    }

    const result = User.authenticate(email, password, ipAddress);

    if (!result.success) {
      return res.render('auth/login', {
        title: 'Sign In - AcxiomCRM',
        returnUrl,
        error: result.message,
        layout: 'layouts/auth'
      });
    }

    // Set secure JWT cookie
    const token = generateToken(result.user);
    res.cookie('acxiom_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    const redirectPath = returnUrl.startsWith('/') ? returnUrl : '/dashboard';
    res.redirect(redirectPath);
  }

  static showRegister(req, res) {
    if (req.user) {
      return res.redirect('/dashboard');
    }
    res.render('auth/register', {
      title: 'Register New Account - AcxiomCRM',
      errors: [],
      data: {},
      layout: 'layouts/auth'
    });
  }

  static async register(req, res) {
    const { name, email, password, confirmPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const errors = [];

    if (!name || !name.trim()) errors.push('Full Name is required.');
    if (!email || !Validator.validateEmail(email)) errors.push('Valid Email address is required.');

    // Password policy check: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    if (!password) {
      errors.push('Password is required.');
    } else if (!Validator.validatePassword(password)) {
      errors.push('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#).');
    }

    if (password !== confirmPassword) {
      errors.push('Password confirmation does not match.');
    }

    // Check email uniqueness
    const existing = User.findByEmail(email);
    if (existing) {
      errors.push(`An account with email "${email}" already exists.`);
    }

    if (errors.length > 0) {
      return res.render('auth/register', {
        title: 'Register New Account - AcxiomCRM',
        errors,
        data: { name, email },
        layout: 'layouts/auth'
      });
    }

    // Create user (assigned role: SalesExecutive)
    const newUserId = User.create({
      name,
      email,
      password,
      role: 'SalesExecutive',
      isActive: 1,
      ipAddress
    });

    const user = User.findById(newUserId);
    const token = generateToken(user);
    res.cookie('acxiom_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000
    });

    res.redirect('/dashboard?registered=true');
  }

  static logout(req, res) {
    if (req.user) {
      AuditService.log({
        userId: req.user.userId,
        userEmail: req.user.email,
        action: 'Logout',
        entityName: 'Security',
        recordId: String(req.user.userId),
        details: 'User logged out.',
        ipAddress: req.ip || '127.0.0.1'
      });
    }

    res.clearCookie('acxiom_token');
    res.redirect('/login');
  }

  static showProfile(req, res) {
    const user = User.findById(req.user.userId);
    res.render('auth/profile', {
      title: 'My Profile - AcxiomCRM',
      user,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static changePassword(req, res) {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const ipAddress = req.ip || '127.0.0.1';
    const user = User.findByEmail(req.user.email);

    if (!bcrypt.compareSync(currentPassword, user.PasswordHash)) {
      return res.redirect('/profile?error=' + encodeURIComponent('Current password is incorrect.'));
    }

    if (!Validator.validatePassword(newPassword)) {
      return res.redirect('/profile?error=' + encodeURIComponent('New password does not meet complexity requirements (min 8 chars, mixed case, numbers, special character).'));
    }

    if (newPassword !== confirmNewPassword) {
      return res.redirect('/profile?error=' + encodeURIComponent('New passwords do not match.'));
    }

    User.resetPassword(user.UserId, newPassword, user.UserId, ipAddress);
    res.redirect('/profile?success=' + encodeURIComponent('Password updated successfully.'));
  }
}

module.exports = AuthController;
