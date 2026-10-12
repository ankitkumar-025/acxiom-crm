const ReportService = require('../services/reportService');

class ReportController {
  static index(req, res) {
    res.render('reports/index', {
      title: 'Reporting Hub & Business Analytics - AcxiomCRM'
    });
  }

  static viewReport(req, res) {
    const { type } = req.params;
    const filters = req.query;

    let reportData = null;
    let reportTitle = 'CRM Report';

    switch (type) {
      case 'customers':
        reportTitle = 'Customer Summary Report';
        reportData = ReportService.getCustomerReport(req.user, filters);
        break;
      case 'leads':
        reportTitle = 'Lead Pipeline & Acquisition Report';
        reportData = ReportService.getLeadReport(req.user, filters);
        break;
      case 'followups':
        reportTitle = 'Follow-Up & Activities Report';
        reportData = ReportService.getFollowUpReport(req.user, filters);
        break;
      case 'opportunities':
        reportTitle = 'Opportunity Forecast & Stage Report';
        reportData = ReportService.getOpportunityReport(req.user, filters);
        break;
      case 'pipeline':
        reportTitle = 'Sales Pipeline & Weighted Forecast Report';
        reportData = ReportService.getPipelineReport(req.user);
        break;
      case 'conversion':
        reportTitle = 'Lead Conversion Funnel Report';
        reportData = ReportService.getConversionReport(req.user);
        break;
      case 'user-activity':
        reportTitle = 'Team Performance & User Activity Report';
        reportData = ReportService.getUserActivityReport(req.user);
        break;
      case 'audit':
        reportTitle = 'Security & Audit Events Report';
        reportData = ReportService.getAuditReport(req.user, filters);
        break;
      default:
        return res.redirect('/reports');
    }

    res.render('reports/view', {
      title: `${reportTitle} - AcxiomCRM`,
      reportType: type,
      reportTitle,
      reportData,
      filters
    });
  }

  static exportCSV(req, res) {
    const { type } = req.params;
    const filters = req.query;

    let data = [];
    let filename = `acxiom-${type}-report-${new Date().toISOString().split('T')[0]}.csv`;

    switch (type) {
      case 'customers':
        data = ReportService.getCustomerReport(req.user, filters);
        break;
      case 'leads':
        data = ReportService.getLeadReport(req.user, filters);
        break;
      case 'followups':
        data = ReportService.getFollowUpReport(req.user, filters);
        break;
      case 'opportunities':
        data = ReportService.getOpportunityReport(req.user, filters);
        break;
      case 'conversion':
        data = ReportService.getConversionReport(req.user);
        break;
      case 'user-activity':
        data = ReportService.getUserActivityReport(req.user);
        break;
      case 'audit':
        data = ReportService.getAuditReport(req.user, filters);
        break;
      default:
        return res.status(400).send('Invalid report type for export.');
    }

    const csvContent = ReportService.toCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  }
}

module.exports = ReportController;
