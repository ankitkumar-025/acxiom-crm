const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || 'acxiom-anti-forgery-token-secret-2026';

function csrfMiddleware(req, res, next) {
  // Generate or retrieve CSRF token from cookie
  let csrfToken = req.cookies ? req.cookies.acxiom_csrf : null;
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie('acxiom_csrf', csrfToken, {
      httpOnly: false, // Accessible by client JS if needed
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  // Provide to Razor/EJS templates
  res.locals.csrfToken = csrfToken;

  // State-changing HTTP methods on Web routes require token validation
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const isApiRequest = req.path.startsWith('/api/');

  if (isStateChanging && !isApiRequest) {
    const submittedToken = (req.body && req.body._csrf) || req.headers['x-csrf-token'];
    
    if (!submittedToken || submittedToken !== csrfToken) {
      console.warn(`[Security] CSRF verification failed for ${req.method} ${req.path}`);
      return res.status(403).render('errors/403', {
        title: 'Anti-Forgery Verification Failed',
        message: 'Security validation error: Invalid or missing Anti-Forgery Token (ValidateAntiForgeryToken). Please refresh and submit the form again.'
      });
    }
  }

  next();
}

module.exports = csrfMiddleware;
