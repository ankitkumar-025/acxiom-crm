const DashboardService = require('../services/dashboardService');

class DashboardController {
  static index(req, res) {
    const dateRange = req.query.dateRange || 'All';
    const customStart = req.query.customStart || null;
    const customEnd = req.query.customEnd || null;

    const data = DashboardService.getMetrics(req.user, dateRange, customStart, customEnd);

    res.render('dashboard/index', {
      title: 'Sales Dashboard - AcxiomCRM',
      metrics: data.kpis,
      charts: data.charts,
      upcomingFollowUps: data.upcomingFollowUps,
      recentAudits: data.recentAudits,
      dateRange,
      customStart,
      customEnd,
      registered: req.query.registered === 'true'
    });
  }
}

module.exports = DashboardController;
