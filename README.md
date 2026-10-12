# AcxiomCRM — Enterprise Sales & CRM Platform

An enterprise-grade Customer Relationship Management (CRM) platform built following the complete 19-page **AcxiomCRM Functional & Technical Project Specification**.

- **Repository**: [https://github.com/ankitkumar-025/acxiom-crm](https://github.com/ankitkumar-025/acxiom-crm)
- **Application URL**: `http://localhost:3000`
- **REST API Base**: `http://localhost:3000/api`

---

## Table of Contents
1. [System Architecture & Layered Design](#1-system-architecture--layered-design)
2. [Pre-Seeded Default Accounts](#2-pre-seeded-default-accounts)
3. [How to Setup & Install from GitHub](#3-how-to-setup--install-from-github)
   - [Prerequisites](#prerequisites)
   - [Method A: One-Command Automated Setup (Recommended)](#method-a-one-command-automated-setup-recommended)
   - [Method B: Manual Step-by-Step Setup](#method-b-manual-step-by-step-setup)
   - [Troubleshooting & FAQs](#troubleshooting--faqs)
4. [How to Use the Application (User Guide & Workflows)](#4-how-to-use-the-application-user-guide--workflows)
   - [1. Logging In & Role-Based Navigation](#1-logging-in--role-based-navigation)
   - [2. Executive Dashboard & KPI Metrics](#2-executive-dashboard--kpi-metrics)
   - [3. Customer Management & 360° Timeline](#3-customer-management--360-timeline)
   - [4. Lead Capture & Atomic Conversion Workflow](#4-lead-capture--atomic-conversion-workflow)
   - [5. Sales Opportunities & Pipeline Forecasting](#5-sales-opportunities--pipeline-forecasting)
   - [6. Follow-Up Management (Upcoming & Overdue)](#6-follow-up-management-upcoming--overdue)
   - [7. User Administration & Account Lockout Security](#7-user-administration--account-lockout-security)
   - [8. Business Analytics & CSV Reports](#8-business-analytics--csv-reports)
   - [9. Immutable Audit Trail & Compliance](#9-immutable-audit-trail--compliance)
5. [Automated Acceptance Testing (15 Scenarios)](#5-automated-acceptance-testing-15-scenarios)
6. [REST API Reference & Curl Examples](#6-rest-api-reference--curl-examples)
7. [Requirement Traceability Matrix](#7-requirement-traceability-matrix)

---

## 1. System Architecture & Layered Design

As defined in Section 3 of the project specification, AcxiomCRM follows a strict layered architecture:

```
Users / API Clients / Web Browsers
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Presentation Layer                                                    │
│  - Responsive Glassmorphic UI (Bootstrap 5.3 + Custom CSS)             │
│  - Interactive Chart.js 4.4 Analytics Visualizations                   │
│  - EJS Template Engine with Server-Side Rendering                      │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Application Layer                                                     │
│  - Express.js Route Dispatchers & MVC Controllers                      │
│  - Anti-Forgery CSRF Validation (Tokens in Forms & Meta Headers)       │
│  - Authentication Guards (JWT Bearer Tokens & HTTP-Only Cookies)       │
│  - Role-Based Access Control: Admin, Manager, SalesExecutive           │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Domain & Business Logic Layer                                         │
│  - Multi-level Client & Server-side Validation Engine                  │
│  - Weighted Pipeline Calculator: (Amount × Probability / 100)          │
│  - Atomic Lead-to-Customer Conversion Transaction Engine               │
│  - Account Lockout Policy (5 failed attempts = 15-min lockout)         │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Data Access Layer (DAL)                                               │
│  - Parameterized Prepared Statements (Zero SQL Injection Risk)         │
│  - Repository Pattern with ACID Transactions                           │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Database Layer                                                        │
│  - SQLite Engine with WAL (Write-Ahead Logging) Mode Enabled           │
│  - Foreign Key Constraints & Performance Indices                       │
└────────────────────────────────────────────────────────────────────────┘

[Cross-Cutting Concerns]: Immutable Audit Logging, ASP.NET-style PBKDF2/Bcrypt Security, Session State
```

---

## 2. Pre-Seeded Default Accounts

The database comes pre-populated with ready-to-use demonstration accounts representing each business role:

| Role | Email | Password | Access Scope & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acxiomcrm.com` | `Admin@123` | **Full Administrative Control**: System settings, user & role management, account unlocks, audit logs, all records and reports. |
| **Manager** | `manager@acxiomcrm.com` | `Manager@123` | **Management Scope**: Team pipeline tracking, conversion analytics, sales performance reports, full audit log viewer. |
| **Sales Executive** | `sales@acxiomcrm.com` | `Sales@123` | **Sales Representative Scope**: Own assigned leads, customers, opportunities, scheduled follow-ups, and personal dashboard. |

---

## 3. How to Setup & Install from GitHub

### Prerequisites
Before installing, make sure your computer has:
- **Git**: [https://git-scm.com/](https://git-scm.com/)
- **Node.js** (v18.0.0 or later, tested on v20 & v24): [https://nodejs.org/](https://nodejs.org/)
- **npm** (comes bundled with Node.js)

---

### Method A: One-Command Automated Setup (Recommended)

Both Linux/macOS and Windows setup scripts are included in the repository. They automatically:
1. Verify Node.js and npm versions.
2. Generate `.env` configuration file.
3. Install all npm dependencies (`npm install`).
4. Initialize the SQLite database and seed demo data (`npm run seed`).
5. Run the 15-test acceptance test suite (`npm test`).
6. Launch the server (`npm start`) on `http://localhost:3000`.

#### On Linux / macOS / WSL / Git Bash:
```bash
# 1. Clone the repository
git clone https://github.com/ankitkumar-025/acxiom-crm.git

# 2. Enter the project folder
cd acxiom-crm

# 3. Grant execution permissions and run setup script
chmod +x setup.sh
./setup.sh
```

> **Note**: To only install packages, seed the database, and run tests without immediately starting the dev server, run:
> ```bash
> ./setup.sh --install-only
> ```

#### On Windows (Command Prompt or PowerShell):
```cmd
git clone https://github.com/ankitkumar-025/acxiom-crm.git
cd acxiom-crm
setup.bat
```
*(Or simply double-click `setup.bat` in Windows File Explorer).*

---

### Method B: Manual Step-by-Step Setup

If you prefer running commands manually:

```bash
# Step 1: Clone the repository
git clone https://github.com/ankitkumar-025/acxiom-crm.git
cd acxiom-crm

# Step 2: Create environment file
# On Linux/macOS:
cp .env.example .env
# On Windows CMD:
copy .env.example .env

# Step 3: Install dependencies
npm install

# Step 4: Initialize and seed the SQLite database
npm run seed

# Step 5: Run the acceptance test suite to verify everything passes
npm test

# Step 6: Start the application
npm start
```

After starting, open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Troubleshooting & FAQs

- **Port 3000 already in use?**
  Open `.env` and change `PORT=3000` to `PORT=3001` or another open port, then restart `npm start`.
- **Node.js not recognized on Windows?**
  Restart your terminal after installing Node.js so that environment PATH variables refresh.
- **Database reset needed?**
  To reset the database back to clean demo state, simply delete `acxiom_crm.db` and run `npm run seed`.

---

## 4. How to Use the Application (User Guide & Workflows)

### 1. Logging In & Role-Based Navigation
1. Go to `http://localhost:3000/login`.
2. Enter one of the demo credentials (e.g. `admin@acxiomcrm.com` / `Admin@123`).
3. Upon signing in:
   - **Admin** sees the complete sidebar: Dashboard, Customers, Leads, Opportunities, Follow-Ups, Reports, User Management, and Audit Logs.
   - **Manager** sees: Dashboard, Customers, Leads, Opportunities, Follow-Ups, Reports, and Audit Logs.
   - **Sales Executive** sees: Dashboard, Customers, Leads, Opportunities, and Follow-Ups restricted strictly to their assigned records.

---

### 2. Executive Dashboard & KPI Metrics
- **8 Real-Time KPI Cards**:
  - Total Customers & Active Customers.
  - Total Leads & Qualified Leads.
  - Active Opportunities & Won/Lost Deals.
  - Weighted Sales Pipeline Value in USD (`Amount × Probability / 100`).
- **Interactive Visualizations (Chart.js)**:
  - **Opportunities by Stage**: Visual breakdown across Prospecting, Qualification, Proposal, Negotiation, and Closed Won.
  - **Monthly Lead Conversions**: 6-month historical trend line.
  - **Leads by Status**: Doughnut chart showing distribution of New, Contacted, Qualified, Lost, and Converted leads.
- **Date Range Filters**: Filter analytics by **Today**, **This Week**, **This Month**, or **This Quarter**.

---

### 3. Customer Management & 360° Timeline
- **Adding a Customer**:
  - Click **Customers** in the sidebar → **Add Customer**.
  - Provide Name, Email, 10-digit Phone, Company, and Status.
  - Real-time client-side validation immediately checks email syntax, 10-digit phone number, and prevents duplicate entries.
  - System automatically generates a unique identifier: `CUST-1001`, `CUST-1002`, etc.
- **Customer 360° Profile View**:
  - Click on any customer name to open their unified profile.
  - **Tab 1 - Overview**: Contact details, company metadata, and assigned sales owner.
  - **Tab 2 - Opportunities**: All active and closed deals tied to this customer.
  - **Tab 3 - Follow-Ups**: History of scheduled, completed, and overdue follow-up calls and meetings.
  - **Tab 4 - Activity Timeline**: Chronological log of calls, notes, emails, and meetings.

---

### 4. Lead Capture & Atomic Conversion Workflow
- **Capturing Leads**:
  - Navigate to **Leads** → **Create Lead**.
  - Capture Prospect Name, Email, Phone, Company, Source (Website, Referral, LinkedIn, Trade Show), and Expected Deal Value.
- **Atomic Lead-to-Customer Conversion**:
  - When a lead reaches **Qualified** status, open the lead and click **Convert to Customer**.
  - A conversion modal appears allowing you to:
    - Automatically generate a permanent **Customer record**.
    - Optionally create an initial **Sales Opportunity** with deal amount and close date.
    - Transfer all notes and assign the sales representative.
  - The conversion executes inside an ACID database transaction:
    - Lead status changes to `Converted`.
    - Customer is created with unique `CUST-XXXX` code.
    - Opportunity is linked to the new customer.
    - An immutable Audit Log event is recorded.

---

### 5. Sales Opportunities & Pipeline Forecasting
- **Creating Deals**:
  - Navigate to **Opportunities** → **New Opportunity**.
  - Select Customer, Opportunity Name, Deal Amount (must be > $0), Stage, Probability (0%–100%), and Expected Close Date (must be today or in the future).
- **Business Rules Enforced**:
  - Rejects `Amount <= 0`.
  - Rejects `Probability > 100`.
  - Rejects past close dates on open opportunities.
- **Weighted Forecast**:
  - Each deal automatically computes its probability-weighted revenue (`$50,000` at `60%` = `$30,000` forecast).

---

### 6. Follow-Up Management (Upcoming & Overdue)
- **Scheduling Follow-Ups**:
  - Go to **Follow-Ups** → **Schedule Follow-Up**.
  - Select Type (Phone Call, Video Meeting, In-Person Meeting, Email, Task).
  - Select scheduled date & time (must not be earlier than current date).
- **Categorization**:
  - **Upcoming**: Scheduled for today or future dates (highlighted in blue/green).
  - **Overdue**: Scheduled dates in the past that were not marked completed (highlighted in bold red badges).
- **Actions**:
  - Click **Complete** to log meeting completion notes.
  - Click **Reschedule** to pick a new future date.

---

### 7. User Administration & Account Lockout Security
*(Restricted to Admin role)*
- **User Management Portal**:
  - Navigate to **Users** in the sidebar.
  - View all registered users, roles, email addresses, and account statuses.
  - Click **Create User** to onboard new employees with specific roles (**Admin**, **Manager**, or **SalesExecutive**).
  - Toggle users active/inactive.
- **Account Lockout Protection (Brute-Force Guard)**:
  - If any user enters 5 consecutive incorrect passwords, their account is automatically locked for 15 minutes.
  - An alert appears: *"Account is locked due to multiple failed login attempts. Please try again later or contact an Administrator."*
  - An Admin can instantly navigate to `/users` and click **Unlock Account** to restore access immediately.

---

### 8. Business Analytics & CSV Reports
- Navigate to **Reports** in the sidebar.
- Choose from 8 comprehensive reports:
  1. **Customer Directory Report** (with active deals and total revenue)
  2. **Lead Acquisition & Status Report**
  3. **Opportunity Pipeline Report** (by stage and sales rep)
  4. **Weighted Pipeline Forecast Report**
  5. **Follow-Up Performance & Overdue Report**
  6. **Lead-to-Customer Conversion Rate Report**
  7. **User Activity & Productivity Report**
  8. **System Audit & Governance Report**
- **One-Click CSV Export**:
  - Click the **Export to CSV** button on any report to instantly download raw tabular data for Microsoft Excel, Google Sheets, or PowerBI.

---

### 9. Immutable Audit Trail & Compliance
- Navigate to **Audit Logs** (Admin and Manager access).
- Every state-changing operation records:
  - **Timestamp**: Exact UTC date and time.
  - **User & Email**: Who performed the action.
  - **Action**: `Login`, `Failed Login`, `Logout`, `Create`, `Update`, `Delete`, `Lead Conversion`, `Account Lockout`, `Account Unlock`.
  - **Entity**: Customer, Lead, Opportunity, FollowUp, User, Security.
  - **Audit Details**: Shows old values vs. new values for compliance traceability.

---

## 5. Automated Acceptance Testing (15 Scenarios)

The test suite validates every acceptance scenario specified in Section 17.19 and Section 13 of the project PDF:

```bash
npm test
```

### Verified Test Cases:
- **Scenario 1:** Unauthenticated access blocked on protected routes (redirects to `/login`, API returns `401 Unauthorized`).
- **Scenario 2:** Authentication generates valid JWT and signs in user.
- **Scenario 3 & 4:** Client & server-side validation rejects invalid email and phone formats.
- **Scenario 4b:** Duplicate customer creation with identical email or phone is blocked.
- **Scenario 5:** Opportunity with `Amount <= 0` is rejected with meaningful error.
- **Scenario 6:** Opportunity with `Probability > 100` is rejected.
- **Scenario 7:** Opportunity with `ExpectedCloseDate` in the past is rejected for active opportunities.
- **Scenario 8:** Follow-up with date earlier than today is rejected for new/planned items.
- **Scenario 9:** Sales Executive scope restriction (only assigned records accessible).
- **Scenario 10:** Manager role accesses full team pipeline data.
- **Scenario 11:** Non-admin roles receive `403 Forbidden` on User Management.
- **Scenario 12:** Audit log entry automatically generated on CRM record creation/updates.
- **Scenario 13:** REST API returns DTO objects without exposing password hashes.
- **Scenario 14:** Lead-to-Customer conversion workflow executes atomically.
- **Security:** Account lockout after 5 consecutive failed login attempts.

---

## 6. REST API Reference & Curl Examples

All endpoints under `/api` accept JSON and return structured responses:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### 1. Authenticate & Obtain JWT Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acxiomcrm.com","password":"Admin@123"}'
```

### 2. Fetch Customers List (DTO)
```bash
curl -X GET http://localhost:3000/api/customers \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 3. Create a Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "CustomerName": "Acme Innovations",
    "Email": "info@acme-innovations.com",
    "Phone": "9876543210",
    "CompanyName": "Acme Corp",
    "Status": "Active"
  }'
```

### 4. Create an Opportunity
```bash
curl -X POST http://localhost:3000/api/opportunities \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "OpportunityName": "Cloud Infrastructure Expansion",
    "CustomerId": 1,
    "Amount": 75000,
    "Stage": "Proposal",
    "Probability": 70,
    "ExpectedCloseDate": "2026-12-15"
  }'
```

### API Endpoint Summary Table
| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate & retrieve JWT | All |
| `POST` | `/api/auth/logout` | Terminate session | All |
| `GET` | `/api/customers` | List/search customers | All (Scoped) |
| `GET` | `/api/customers/:id` | Get customer by ID | All (Scoped) |
| `POST` | `/api/customers` | Create new customer | All |
| `PUT` | `/api/customers/:id` | Update customer | All (Scoped) |
| `DELETE` | `/api/customers/:id` | Delete customer | Admin, Manager |
| `GET` | `/api/leads` | List/search leads | All (Scoped) |
| `POST` | `/api/leads` | Create lead | All |
| `POST` | `/api/leads/:id/convert`| Convert lead to customer | All (Scoped) |
| `GET` | `/api/opportunities` | List opportunities | All (Scoped) |
| `POST` | `/api/opportunities` | Create opportunity | All |
| `GET` | `/api/followups` | List follow-ups | All (Scoped) |
| `POST` | `/api/followups` | Schedule follow-up | All |
| `GET` | `/api/reports/pipeline` | Pipeline summary data | Admin, Manager |

---

## 7. Requirement Traceability Matrix

| Requirement Area | Specification Section | Implementation Details |
| :--- | :--- | :--- |
| **Authentication & Lockout** | 4.2, 6.1, 6.2, 6.3, 17.4 | Adaptive password hashing, 8+ char complexity policy, 5 failed attempts trigger 15-min lockout, Admin unlock. |
| **Role-Based Authorization** | 7, 17.10 | 3 Roles: **Admin** (system/users/audit), **Manager** (team pipeline/reports), **SalesExecutive** (assigned records only). |
| **Executive Dashboard** | 4.3, 17.11, 17.12 | 8 KPI Cards (Total/Open Customers, Leads, Opps, Won/Lost, Pipeline Value), 3 Chart.js graphs, Date range filters. |
| **Customer Management** | 4.4, 17.3, 17.5 | Full CRUD, unique code generation (`CUST-XXXX`), unique email & 10-digit phone enforcement, 4-tab history timeline. |
| **Lead Management & Conversion** | 4.5, 8, 17.6 | Lead capture, qualification status, atomic Lead-to-Customer conversion wizard with Audit logging. |
| **Opportunity & Pipeline** | 4.8, 17.3, 17.7 | Amount > 0, Probability (0-100), Expected Close Date >= Today, weighted pipeline formula (`Amount × Prob / 100`). |
| **Follow-Up Management** | 4.6, 17.3, 17.7 | FollowUpDate >= Today validation, Upcoming & Overdue categories, Complete and Reschedule workflows. |
| **Activity Tracking** | 17.2, 17.3 | Log Calls, Meetings, Emails, Tasks linked to Customer or Lead. |
| **User & Role Administration** | 4.7, 17.2 | Admin-only portal to create users, assign roles, toggle active status, unlock accounts, and reset passwords. |
| **Audit Trail & Governance** | 4.9, 17.16 | Append-only immutable log for Login, Logout, Failed Login, Create, Update, Delete, Conversions with old/new values. |
| **REST API** | 4.10, 10, 17.14 | Secured DTO endpoints for Customers, Leads, Opportunities, Follow-Ups, and Pipeline data with proper HTTP status codes. |
| **Business Analytics Reports** | 4.11, 11 | 8 full reports (Customer, Lead, Follow-Up, Opp, Pipeline, Conversion, User Activity, Audit) with one-click CSV export. |
