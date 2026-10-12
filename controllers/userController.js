const User = require('../models/User');
const Validator = require('../middleware/validation');

class UserController {
  static index(req, res) {
    const users = User.getAllUsers();
    res.render('users/index', {
      title: 'User & Role Administration - AcxiomCRM',
      users,
      success: req.query.success || null,
      error: req.query.error || null
    });
  }

  static create(req, res) {
    res.render('users/create', {
      title: 'Create User - AcxiomCRM',
      errors: [],
      data: {}
    });
  }

  static store(req, res) {
    const { name, email, password, role, isActive } = req.body;
    const ipAddress = req.ip || '127.0.0.1';
    const errors = [];

    if (!name || !name.trim()) errors.push('Name is required.');
    if (!email || !Validator.validateEmail(email)) errors.push('Valid email address is required.');
    
    // Password policy
    if (!password || !Validator.validatePassword(password)) {
      errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
    }

    const validRoles = ['Admin', 'Manager', 'SalesExecutive'];
    if (!validRoles.includes(role)) {
      errors.push(`Role must be one of: ${validRoles.join(', ')}.`);
    }

    if (User.findByEmail(email)) {
      errors.push(`A user with email "${email}" already exists.`);
    }

    if (errors.length > 0) {
      return res.status(400).render('users/create', {
        title: 'Create User - AcxiomCRM',
        errors,
        data: req.body
      });
    }

    try {
      User.create({
        name,
        email,
        password,
        role,
        isActive: isActive === '1' || isActive === 'true' || isActive === 'on' ? 1 : 0,
        createdBy: req.user.userId,
        ipAddress
      });
      res.redirect('/users?success=' + encodeURIComponent(`User "${name}" created with role "${role}".`));
    } catch (err) {
      res.status(500).render('users/create', {
        title: 'Create User - AcxiomCRM',
        errors: ['Failed to create user: ' + err.message],
        data: req.body
      });
    }
  }

  static toggleStatus(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    const user = User.findById(id);

    if (!user) {
      return res.redirect('/users?error=' + encodeURIComponent('User not found.'));
    }

    if (user.UserId === req.user.userId) {
      return res.redirect('/users?error=' + encodeURIComponent('You cannot deactivate your own administrative account.'));
    }

    const newStatus = user.IsActive === 1 ? 0 : 1;
    User.update(id, { name: user.Name, role: user.Role, isActive: newStatus, updatedBy: req.user.userId, ipAddress });

    const msg = newStatus === 1 ? `User "${user.Name}" activated.` : `User "${user.Name}" deactivated.`;
    res.redirect('/users?success=' + encodeURIComponent(msg));
  }

  static unlock(req, res) {
    const id = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';
    User.unlock(id, req.user.userId, ipAddress);
    res.redirect('/users?success=' + encodeURIComponent('User account unlocked and failed login counter reset.'));
  }

  static resetPassword(req, res) {
    const id = req.params.id;
    const { newPassword } = req.body;
    const ipAddress = req.ip || '127.0.0.1';

    if (!newPassword || !Validator.validatePassword(newPassword)) {
      return res.redirect('/users?error=' + encodeURIComponent('New password must meet password policy (min 8 chars, uppercase, lowercase, number, special char).'));
    }

    User.resetPassword(id, newPassword, req.user.userId, ipAddress);
    res.redirect('/users?success=' + encodeURIComponent('User password reset successfully.'));
  }
}

module.exports = UserController;
