const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'acxiom-crm-super-secure-production-secret-key-2026';

/**
 * Middleware to require authentication (supports Cookie session and Authorization: Bearer token for APIs)
 */
function requireAuth(req, res, next) {
  // Check Authorization header first (for API)
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.acxiom_token) {
    token = req.cookies.acxiom_token;
  }

  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }
    req.session = req.session || {};
    return res.redirect('/login?returnUrl=' + encodeURIComponent(req.originalUrl));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch latest user details from DB to verify active status and role
    const user = db.prepare('SELECT UserId, Name, Email, Role, IsActive, LockoutEnd FROM Users WHERE UserId = ?').get(decoded.userId);
    
    if (!user || user.IsActive !== 1) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Account is deactivated or does not exist.' });
      }
      res.clearCookie('acxiom_token');
      return res.redirect('/login?error=' + encodeURIComponent('Your account is deactivated. Contact an administrator.'));
    }

    // Check if currently locked out
    if (user.LockoutEnd && new Date(user.LockoutEnd) > new Date()) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: `Account locked until ${user.LockoutEnd}.` });
      }
      res.clearCookie('acxiom_token');
      return res.redirect('/login?error=' + encodeURIComponent(`Account is locked out until ${new Date(user.LockoutEnd).toLocaleTimeString()}.`));
    }

    req.user = {
      userId: user.UserId,
      name: user.Name,
      email: user.Email,
      role: user.Role
    };
    res.locals.currentUser = req.user;
    next();
  } catch (err) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session/token.' });
    }
    res.clearCookie('acxiom_token');
    return res.redirect('/login?error=' + encodeURIComponent('Session expired. Please log in again.'));
  }
}

/**
 * Middleware to restrict access by role(s)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.user.role)) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
        });
      }
      return res.status(403).render('errors/403', {
        title: 'Access Denied',
        message: `Your role (${req.user.role}) does not have permission to access this resource.`
      });
    }

    next();
  };
}

/**
 * Helper to generate JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.UserId,
      email: user.Email,
      name: user.Name,
      role: user.Role
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = {
  requireAuth,
  requireRole,
  generateToken,
  JWT_SECRET
};
