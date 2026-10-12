const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('../config/database');

function seedDatabase() {
  initializeDatabase();

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM Users').get().count;
  if (userCount > 0) {
    console.log('[Seed] Database already contains users. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding initial database records...');

  // 1. Roles
  const insertRole = db.prepare('INSERT OR IGNORE INTO Roles (RoleName) VALUES (?)');
  insertRole.run('Admin');
  insertRole.run('Manager');
  insertRole.run('SalesExecutive');

  // 2. Default Users
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const managerHash = bcrypt.hashSync('Manager@123', salt);
  const salesHash = bcrypt.hashSync('Sales@123', salt);

  const insertUser = db.prepare(`
    INSERT INTO Users (Name, Email, PasswordHash, Role, IsActive, CreatedDate)
    VALUES (?, ?, ?, ?, 1, datetime('now', '-30 days', 'localtime'))
  `);

  const adminResult = insertUser.run('Global Administrator', 'admin@acxiomcrm.com', adminHash, 'Admin');
  const managerResult = insertUser.run('Regional Sales Manager', 'manager@acxiomcrm.com', managerHash, 'Manager');
  const sales1Result = insertUser.run('Alex Mercer (Sales)', 'sales@acxiomcrm.com', salesHash, 'SalesExecutive');
  const sales2Result = insertUser.run('Sarah Connor (Sales)', 'sarah.sales@acxiomcrm.com', salesHash, 'SalesExecutive');

  const adminId = adminResult.lastInsertRowid;
  const managerId = managerResult.lastInsertRowid;
  const sales1Id = sales1Result.lastInsertRowid;
  const sales2Id = sales2Result.lastInsertRowid;

  // 3. Customers
  const insertCustomer = db.prepare(`
    INSERT INTO Customers (CustomerCode, CustomerName, Email, Phone, CompanyName, Address, City, State, Status, CreatedDate, CreatedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)
  `);

  const c1 = insertCustomer.run('CUST-1001', 'Apex Cloud Solutions', 'contact@apexcloud.io', '9876543210', 'Apex Cloud Corp', 'Tower 4, Cyber City', 'Gurugram', 'Haryana', 'Active', '-20 days', sales1Id);
  const c2 = insertCustomer.run('CUST-1002', 'Zenith Financial Tech', 'info@zenithfin.com', '9812345678', 'Zenith FinTech Pvt Ltd', '12 Financial District', 'Mumbai', 'Maharashtra', 'Active', '-18 days', sales1Id);
  const c3 = insertCustomer.run('CUST-1003', 'BioHealth Pharmaceuticals', 'procurement@biohealth.org', '9723456789', 'BioHealth Global', 'Sector 18, Electronic City', 'Bengaluru', 'Karnataka', 'Active', '-15 days', sales2Id);
  const c4 = insertCustomer.run('CUST-1004', 'BlueWave Logistics', 'ops@bluewavelog.in', '9634567890', 'BlueWave Supply Chain', 'Port Area Road', 'Chennai', 'Tamil Nadu', 'Active', '-12 days', sales2Id);
  const c5 = insertCustomer.run('CUST-1005', 'Nova Energy Systems', 'support@novaenergy.com', '9545678901', 'Nova Renewable Ltd', 'Ring Road', 'Pune', 'Maharashtra', 'Inactive', '-8 days', sales1Id);

  // 4. Leads
  const insertLead = db.prepare(`
    INSERT INTO Leads (LeadCode, LeadName, Email, Phone, CompanyName, Source, Status, Priority, ExpectedValue, Notes, CreatedDate, AssignedTo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)
  `);

  insertLead.run('LEAD-2001', 'Michael Vance', 'mvance@quantumtech.com', '9123456780', 'Quantum Technologies', 'Website', 'New', 'High', 150000, 'Inquired about enterprise CRM cloud deployment.', '-25 days', sales1Id);
  insertLead.run('LEAD-2002', 'Priya Sharma', 'psharma@nexusoft.in', '9234567891', 'Nexus Software Solutions', 'Referral', 'Contacted', 'Medium', 75000, 'Demonstrated product features on intro call.', '-14 days', sales1Id);
  insertLead.run('LEAD-2003', 'David Miller', 'dmiller@vanguard.co', '9345678912', 'Vanguard Retail Systems', 'Cold Call', 'Qualified', 'High', 220000, 'Budget approved. Ready for proposal generation.', '-10 days', sales2Id);
  insertLead.run('LEAD-2004', 'Anita Roy', 'anita@kryptonlogistics.com', '9456789123', 'Krypton Transport', 'Advertisement', 'Unqualified', 'Low', 35000, 'Budget too small for current enterprise tier.', '-7 days', sales2Id);
  insertLead.run('LEAD-2005', 'Rohit Verma', 'rohit@elevateconsult.org', '9567891234', 'Elevate Management', 'Partner', 'Converted', 'High', 180000, 'Converted to Customer Apex Cloud Solutions.', '-5 days', sales1Id);
  insertLead.run('LEAD-2006', 'Samantha Reed', 'sreed@orionglobal.io', '9678912345', 'Orion Global Media', 'Website', 'Lost', 'Medium', 90000, 'Chose legacy local vendor.', '-4 days', sales2Id);

  // 5. Opportunities
  const insertOpp = db.prepare(`
    INSERT INTO Opportunities (OpportunityName, CustomerId, Amount, Stage, Probability, ExpectedCloseDate, Status, Notes, CreatedDate, AssignedTo)
    VALUES (?, ?, ?, ?, ?, date('now', ?), ?, ?, datetime('now', ?), ?)
  `);

  insertOpp.run('Apex Cloud Migration Suite', c1.lastInsertRowid, 120000, 'Proposal', 60, '+15 days', 'Open', 'Proposal delivered, awaiting stakeholder review.', '-15 days', sales1Id);
  insertOpp.run('Zenith Security Compliance Module', c2.lastInsertRowid, 85000, 'Negotiation', 80, '+10 days', 'Open', 'Final pricing discussions with finance head.', '-12 days', sales1Id);
  insertOpp.run('BioHealth Multi-Region Analytics', c3.lastInsertRowid, 240000, 'Qualification', 30, '+30 days', 'Open', 'Initial requirement gathering completed.', '-10 days', sales2Id);
  insertOpp.run('BlueWave Fleet Tracking Integration', c4.lastInsertRowid, 160000, 'Won', 100, '+2 days', 'Won', 'Contract signed and advance payment received!', '-20 days', sales2Id);
  insertOpp.run('Nova Legacy Upgrade Tier 1', c5.lastInsertRowid, 45000, 'Lost', 0, '+5 days', 'Lost', 'Customer deferred project until next fiscal year.', '-18 days', sales1Id);

  // 6. Follow-Ups (Including Upcoming, Overdue, and Completed)
  const insertFollowUp = db.prepare(`
    INSERT INTO FollowUps (CustomerId, FollowUpDate, FollowUpType, Subject, Remarks, Status, AssignedTo, CreatedDate, CompletedDate)
    VALUES (?, date('now', ?), ?, ?, ?, ?, ?, datetime('now', ?), ?)
  `);

  // Upcoming follow-up (tomorrow)
  insertFollowUp.run(c1.lastInsertRowid, '+1 days', 'Call', 'Contract Review with VP Tech', 'Review terms of cloud migration agreement.', 'Planned', sales1Id, '-2 days', null);
  // Upcoming follow-up (in 3 days)
  insertFollowUp.run(c2.lastInsertRowid, '+3 days', 'Meeting', 'Executive Steering Meeting', 'Present updated ROI metrics to CFO.', 'Planned', sales1Id, '-1 days', null);
  // Overdue follow-up (yesterday)
  insertFollowUp.run(c3.lastInsertRowid, '-1 days', 'Email', 'Send revised pricing matrix', 'Follow up on discounted rate proposal.', 'Missed', sales2Id, '-5 days', null);
  // Completed follow-up
  insertFollowUp.run(c4.lastInsertRowid, '-3 days', 'Call', 'Implementation Kickoff Call', 'Scope confirmed with technical leads.', 'Completed', sales2Id, '-6 days', 'datetime("now", "-3 days")');

  // 7. Activities
  const insertActivity = db.prepare(`
    INSERT INTO Activities (ActivityType, Subject, Description, ActivityDate, CustomerId, AssignedTo, Status, CreatedDate)
    VALUES (?, ?, ?, date('now', ?), ?, ?, 'Completed', datetime('now', ?))
  `);

  insertActivity.run('Call', 'Discovery Phone Call with Apex VP', 'Discussed cloud scaling requirements and current bottlenecks.', '-14 days', c1.lastInsertRowid, sales1Id, '-14 days');
  insertActivity.run('Meeting', 'On-site Architecture Demo at Zenith', 'Walked through API security and real-time ledger sync.', '-10 days', c2.lastInsertRowid, sales1Id, '-10 days');
  insertActivity.run('Email', 'Formal Proposal Document & SLA Details', 'Dispatched signed quote and NDA documentation.', '-7 days', c3.lastInsertRowid, sales2Id, '-7 days');
  insertActivity.run('Task', 'Prepare Custom Scope Presentation', 'Finalized 12-page presentation on supply chain tracking.', '-4 days', c4.lastInsertRowid, sales2Id, '-4 days');

  // 8. Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO AuditLogs (UserId, UserEmail, Action, EntityName, RecordId, Details, IpAddress, CreatedDate)
    VALUES (?, ?, ?, ?, ?, ?, '127.0.0.1', datetime('now', ?))
  `);

  insertAudit.run(adminId, 'admin@acxiomcrm.com', 'Security Event', 'Security', 'SYSTEM', 'System initialization and default administrative policies applied.', '-30 days');
  insertAudit.run(adminId, 'admin@acxiomcrm.com', 'Create', 'User', String(sales1Id), 'Created sales executive account for Alex Mercer.', '-30 days');
  insertAudit.run(sales1Id, 'sales@acxiomcrm.com', 'Login', 'Security', 'LOGIN_SUCCESS', 'User logged in successfully.', '-20 days');
  insertAudit.run(sales1Id, 'sales@acxiomcrm.com', 'Create', 'Customer', String(c1.lastInsertRowid), 'Created customer Apex Cloud Solutions.', '-20 days');
  insertAudit.run(sales1Id, 'sales@acxiomcrm.com', 'Lead Conversion', 'Lead', 'LEAD-2005', 'Converted qualified lead to customer Apex Cloud Solutions.', '-5 days');

  console.log('[Seed] Database successfully seeded with production test data.');
}

module.exports = {
  seedDatabase
};
