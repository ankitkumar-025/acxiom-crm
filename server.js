const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const expressLayouts = require('express-ejs-layouts');

const { db, initializeDatabase } = require('./config/database');
const { seedDatabase } = require('./data/seed');
const { JWT_SECRET } = require('./middleware/auth');
const csrfMiddleware = require('./middleware/csrf');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database schema and initial seed records
initializeDatabase();
seedDatabase();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Body parsers & cookies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Attach current user from cookie to res.locals for view rendering
app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.currentPath = req.path;

  const token = req.cookies && req.cookies.acxiom_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT UserId, Name, Email, Role, IsActive FROM Users WHERE UserId = ?').get(decoded.userId);
      if (user && user.IsActive === 1) {
        req.user = {
          userId: user.UserId,
          name: user.Name,
          email: user.Email,
          role: user.Role
        };
        res.locals.currentUser = req.user;
      }
    } catch (err) {
      // Invalid/expired token, ignore
    }
  }
  next();
});

// Anti-Forgery CSRF protection
app.use(csrfMiddleware);

// API Routes
app.use('/api', apiRoutes);

// Web MVC Routes
app.use('/', webRoutes);

// 404 Handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.status(404).render('errors/404', {
    title: 'Page Not Found - AcxiomCRM',
    message: 'The page you requested does not exist or has been moved.'
  });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
  res.status(500).render('errors/500', {
    title: 'Server Error - AcxiomCRM',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` AcxiomCRM Enterprise Server running on port ${PORT}`);
    console.log(` Web URL: http://localhost:${PORT}`);
    console.log(` REST API: http://localhost:${PORT}/api`);
    console.log(` Default Admin: admin@acxiomcrm.com / Admin@123`);
    console.log(` Default Manager: manager@acxiomcrm.com / Manager@123`);
    console.log(` Default Sales: sales@acxiomcrm.com / Sales@123`);
    console.log(`========================================================`);
  });
}

module.exports = app;
