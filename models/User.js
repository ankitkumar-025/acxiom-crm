const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const AuditService = require('../services/auditService');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

class User {
  static findById(id) {
    return db.prepare('SELECT UserId, Name, Email, Role, IsActive, FailedLoginCount, LockoutEnd, CreatedDate FROM Users WHERE UserId = ?').get(id);
  }

  static findByEmail(email) {
    if (!email) return null;
    return db.prepare('SELECT * FROM Users WHERE LOWER(Email) = LOWER(?)').get(email.trim());
  }

  static getAllUsers() {
    return db.prepare('SELECT UserId, Name, Email, Role, IsActive, FailedLoginCount, LockoutEnd, CreatedDate FROM Users ORDER BY UserId ASC').all();
  }

  static getSalesExecutives() {
    return db.prepare("SELECT UserId, Name, Email, Role FROM Users WHERE Role = 'SalesExecutive' AND IsActive = 1 ORDER BY Name ASC").all();
  }

  /**
   * Authenticate user with password policy & lockout enforcement
   */
  static authenticate(email, password, ipAddress = '127.0.0.1') {
    const user = this.findByEmail(email);

    if (!user) {
      AuditService.log({
        action: 'Failed Login',
        entityName: 'Security',
        recordId: 'USER_NOT_FOUND',
        details: `Login failed: Non-existent email "${email}".`,
        ipAddress
      });
      return { success: false, message: 'Invalid email or password.' };
    }

    // Check if account is active
    if (user.IsActive !== 1) {
      AuditService.log({
        userId: user.UserId,
        userEmail: user.Email,
        action: 'Failed Login',
        entityName: 'Security',
        recordId: String(user.UserId),
        details: 'Login rejected: User account is deactivated.',
        ipAddress
      });
      return { success: false, message: 'This account has been deactivated. Please contact an administrator.' };
    }

    // Check lockout status
    if (user.LockoutEnd) {
      const lockoutEnd = new Date(user.LockoutEnd);
      const now = new Date();
      if (lockoutEnd > now) {
        const remainingMinutes = Math.ceil((lockoutEnd - now) / 60000);
        AuditService.log({
          userId: user.UserId,
          userEmail: user.Email,
          action: 'Failed Login',
          entityName: 'Security',
          recordId: String(user.UserId),
          details: `Login rejected: Account is currently locked out until ${user.LockoutEnd}.`,
          ipAddress
        });
        return {
          success: false,
          isLocked: true,
          message: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or contact an administrator.`
        };
      } else {
        // Lockout expired, reset lockout
        db.prepare('UPDATE Users SET LockoutEnd = NULL, FailedLoginCount = 0 WHERE UserId = ?').run(user.UserId);
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
      }
    }

    // Verify password hash
    const isMatch = bcrypt.compareSync(password, user.PasswordHash);
    if (!isMatch) {
      const newFailedCount = (user.FailedLoginCount || 0) + 1;
      let newLockoutEnd = null;
      let isNowLocked = false;

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        newLockoutEnd = lockDate.toISOString();
        isNowLocked = true;

        db.prepare('UPDATE Users SET FailedLoginCount = ?, LockoutEnd = ? WHERE UserId = ?')
          .run(newFailedCount, newLockoutEnd, user.UserId);

        AuditService.log({
          userId: user.UserId,
          userEmail: user.Email,
          action: 'Security Event',
          entityName: 'Security',
          recordId: String(user.UserId),
          details: `Account LOCKED OUT after ${newFailedCount} failed login attempts until ${newLockoutEnd}.`,
          ipAddress
        });

        return {
          success: false,
          isLocked: true,
          message: `Too many failed attempts. Your account has been locked for ${LOCKOUT_MINUTES} minutes.`
        };
      } else {
        db.prepare('UPDATE Users SET FailedLoginCount = ? WHERE UserId = ?')
          .run(newFailedCount, user.UserId);

        const attemptsRemaining = MAX_FAILED_ATTEMPTS - newFailedCount;
        AuditService.log({
          userId: user.UserId,
          userEmail: user.Email,
          action: 'Failed Login',
          entityName: 'Security',
          recordId: String(user.UserId),
          details: `Failed password attempt (${newFailedCount}/${MAX_FAILED_ATTEMPTS}).`,
          ipAddress
        });

        return {
          success: false,
          message: `Invalid email or password. ${attemptsRemaining} attempt(s) remaining before account lockout.`
        };
      }
    }

    // Successful login: reset failed counters
    db.prepare('UPDATE Users SET FailedLoginCount = 0, LockoutEnd = NULL WHERE UserId = ?').run(user.UserId);

    AuditService.log({
      userId: user.UserId,
      userEmail: user.Email,
      action: 'Login',
      entityName: 'Security',
      recordId: String(user.UserId),
      details: 'User authenticated successfully.',
      ipAddress
    });

    return {
      success: true,
      user: {
        UserId: user.UserId,
        Name: user.Name,
        Email: user.Email,
        Role: user.Role
      }
    };
  }

  /**
   * Create a new user with hashed password
   */
  static create({ name, email, password, role = 'SalesExecutive', isActive = 1, createdBy = null, ipAddress = '127.0.0.1' }) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const stmt = db.prepare(`
      INSERT INTO Users (Name, Email, PasswordHash, Role, IsActive, FailedLoginCount, CreatedDate)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))
    `);

    const result = stmt.run(name.trim(), email.trim(), passwordHash, role, isActive ? 1 : 0);
    const newUserId = result.lastInsertRowid;

    AuditService.log({
      userId: createdBy,
      action: 'Create',
      entityName: 'User',
      recordId: String(newUserId),
      newValue: { name, email, role, isActive },
      details: `Created new user ${name} with role ${role}.`,
      ipAddress
    });

    return newUserId;
  }

  /**
   * Update user details and role
   */
  static update(userId, { name, role, isActive, updatedBy = null, ipAddress = '127.0.0.1' }) {
    const current = this.findById(userId);
    if (!current) return false;

    db.prepare(`
      UPDATE Users
      SET Name = ?, Role = ?, IsActive = ?
      WHERE UserId = ?
    `).run(name.trim(), role, isActive ? 1 : 0, userId);

    AuditService.log({
      userId: updatedBy,
      action: current.Role !== role ? 'Role Change' : 'Update',
      entityName: 'User',
      recordId: String(userId),
      oldValue: { name: current.Name, role: current.Role, isActive: current.IsActive },
      newValue: { name, role, isActive },
      details: `Updated user ${name} profile/role.`,
      ipAddress
    });

    return true;
  }

  /**
   * Admin unlock locked account
   */
  static unlock(userId, unlockedBy = null, ipAddress = '127.0.0.1') {
    db.prepare('UPDATE Users SET FailedLoginCount = 0, LockoutEnd = NULL WHERE UserId = ?').run(userId);

    AuditService.log({
      userId: unlockedBy,
      action: 'Security Event',
      entityName: 'User',
      recordId: String(userId),
      details: `Admin unlocked user account ID ${userId}.`,
      ipAddress
    });
  }

  /**
   * Admin or User reset password
   */
  static resetPassword(userId, newPassword, resetBy = null, ipAddress = '127.0.0.1') {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE Users SET PasswordHash = ?, FailedLoginCount = 0, LockoutEnd = NULL WHERE UserId = ?')
      .run(passwordHash, userId);

    AuditService.log({
      userId: resetBy,
      action: 'Security Event',
      entityName: 'User',
      recordId: String(userId),
      details: `Password reset successfully for user ID ${userId}.`,
      ipAddress
    });
  }
}

module.exports = User;
