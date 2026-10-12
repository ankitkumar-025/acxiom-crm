const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'acxiom_crm.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance & concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    -- Roles Table
    CREATE TABLE IF NOT EXISTS Roles (
      RoleId INTEGER PRIMARY KEY AUTOINCREMENT,
      RoleName TEXT UNIQUE NOT NULL
    );

    -- Users Table (Matching ASP.NET Core Identity semantics)
    CREATE TABLE IF NOT EXISTS Users (
      UserId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      PasswordHash TEXT NOT NULL,
      Role TEXT NOT NULL DEFAULT 'SalesExecutive',
      IsActive INTEGER NOT NULL DEFAULT 1,
      FailedLoginCount INTEGER NOT NULL DEFAULT 0,
      LockoutEnd TEXT,
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Customers Table
    CREATE TABLE IF NOT EXISTS Customers (
      CustomerId INTEGER PRIMARY KEY AUTOINCREMENT,
      CustomerCode TEXT UNIQUE NOT NULL,
      CustomerName TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      Phone TEXT UNIQUE NOT NULL,
      CompanyName TEXT,
      Address TEXT,
      City TEXT,
      State TEXT,
      Status TEXT NOT NULL DEFAULT 'Active', -- Active, Inactive
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      CreatedBy INTEGER,
      FOREIGN KEY (CreatedBy) REFERENCES Users(UserId) ON DELETE SET NULL
    );

    -- Leads Table
    CREATE TABLE IF NOT EXISTS Leads (
      LeadId INTEGER PRIMARY KEY AUTOINCREMENT,
      LeadCode TEXT UNIQUE NOT NULL,
      LeadName TEXT NOT NULL,
      Email TEXT NOT NULL,
      Phone TEXT NOT NULL,
      CompanyName TEXT,
      Source TEXT NOT NULL DEFAULT 'Website', -- Website, Referral, Cold Call, Advertisement, Partner, Other
      Status TEXT NOT NULL DEFAULT 'New', -- New, Contacted, Qualified, Unqualified, Converted, Lost
      Priority TEXT NOT NULL DEFAULT 'Medium', -- Low, Medium, High
      ExpectedValue REAL NOT NULL DEFAULT 0,
      Notes TEXT,
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      AssignedTo INTEGER,
      ConvertedCustomerId INTEGER,
      ConvertedOpportunityId INTEGER,
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId) ON DELETE SET NULL,
      FOREIGN KEY (ConvertedCustomerId) REFERENCES Customers(CustomerId) ON DELETE SET NULL,
      FOREIGN KEY (ConvertedOpportunityId) REFERENCES Opportunities(OpportunityId) ON DELETE SET NULL
    );

    -- Opportunities Table
    CREATE TABLE IF NOT EXISTS Opportunities (
      OpportunityId INTEGER PRIMARY KEY AUTOINCREMENT,
      OpportunityName TEXT NOT NULL,
      CustomerId INTEGER NOT NULL,
      LeadId INTEGER,
      Amount REAL NOT NULL,
      Stage TEXT NOT NULL DEFAULT 'Qualification', -- Qualification, Proposal, Negotiation, Won, Lost
      Probability INTEGER NOT NULL DEFAULT 20, -- 0 to 100
      ExpectedCloseDate TEXT NOT NULL,
      Status TEXT NOT NULL DEFAULT 'Open', -- Open, Won, Lost
      Notes TEXT,
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      AssignedTo INTEGER,
      FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId) ON DELETE CASCADE,
      FOREIGN KEY (LeadId) REFERENCES Leads(LeadId) ON DELETE SET NULL,
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId) ON DELETE SET NULL
    );

    -- Follow-Ups Table
    CREATE TABLE IF NOT EXISTS FollowUps (
      FollowUpId INTEGER PRIMARY KEY AUTOINCREMENT,
      CustomerId INTEGER,
      LeadId INTEGER,
      OpportunityId INTEGER,
      FollowUpDate TEXT NOT NULL,
      FollowUpType TEXT NOT NULL DEFAULT 'Call', -- Call, Email, Meeting, Visit, Other
      Subject TEXT NOT NULL,
      Remarks TEXT,
      Status TEXT NOT NULL DEFAULT 'Planned', -- Planned, Completed, Missed, Cancelled
      AssignedTo INTEGER,
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      CompletedDate TEXT,
      FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId) ON DELETE CASCADE,
      FOREIGN KEY (LeadId) REFERENCES Leads(LeadId) ON DELETE CASCADE,
      FOREIGN KEY (OpportunityId) REFERENCES Opportunities(OpportunityId) ON DELETE CASCADE,
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId) ON DELETE SET NULL
    );

    -- Activities Table (Calls, Meetings, Emails, Tasks)
    CREATE TABLE IF NOT EXISTS Activities (
      ActivityId INTEGER PRIMARY KEY AUTOINCREMENT,
      ActivityType TEXT NOT NULL, -- Call, Meeting, Email, Task
      Subject TEXT NOT NULL,
      Description TEXT,
      ActivityDate TEXT NOT NULL,
      CustomerId INTEGER,
      LeadId INTEGER,
      OpportunityId INTEGER,
      AssignedTo INTEGER,
      Status TEXT NOT NULL DEFAULT 'Completed', -- Completed, Pending, Cancelled
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId) ON DELETE CASCADE,
      FOREIGN KEY (LeadId) REFERENCES Leads(LeadId) ON DELETE CASCADE,
      FOREIGN KEY (OpportunityId) REFERENCES Opportunities(OpportunityId) ON DELETE CASCADE,
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId) ON DELETE SET NULL
    );

    -- Audit Log Table (Append-only, immutable tracking)
    CREATE TABLE IF NOT EXISTS AuditLogs (
      AuditLogId INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER,
      UserEmail TEXT,
      Action TEXT NOT NULL, -- Login, Failed Login, Logout, Create, Update, Delete, Role Change, Security Event, Lead Conversion
      EntityName TEXT NOT NULL, -- Customer, Lead, Opportunity, FollowUp, Activity, User, Security
      RecordId TEXT,
      OldValue TEXT,
      NewValue TEXT,
      Details TEXT,
      IpAddress TEXT,
      CreatedDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE SET NULL
    );

    -- Indexes for high performance queries & reports
    CREATE INDEX IF NOT EXISTS idx_customers_email ON Customers(Email);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON Customers(Phone);
    CREATE INDEX IF NOT EXISTS idx_customers_createdby ON Customers(CreatedBy);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned ON Leads(AssignedTo);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON Leads(Status);
    CREATE INDEX IF NOT EXISTS idx_opps_stage ON Opportunities(Stage);
    CREATE INDEX IF NOT EXISTS idx_opps_assigned ON Opportunities(AssignedTo);
    CREATE INDEX IF NOT EXISTS idx_opps_customer ON Opportunities(CustomerId);
    CREATE INDEX IF NOT EXISTS idx_followups_date ON FollowUps(FollowUpDate);
    CREATE INDEX IF NOT EXISTS idx_followups_assigned ON FollowUps(AssignedTo);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLogs(CreatedDate);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON AuditLogs(EntityName);
  `);

  console.log('[Database] Schema initialized successfully.');
}

module.exports = {
  db,
  initializeDatabase
};
