# AcxiomCRM — Enterprise Sales & CRM Platform

An enterprise-grade Customer Relationship Management (CRM) platform built following the complete 19-page **AcxiomCRM Functional & Technical Project Specification**.

---

## 1. System Architecture & Layered Design

As defined in Section 3 of the project specification, AcxiomCRM follows a strict layered architecture:

```
Users / API Clients
       │
       ▼
[Presentation Layer]     (Responsive Modern Glassmorphic UI / Bootstrap 5.3 / Chart.js / Razor EJS Views)
       │
       ▼
[Application Layer]      (Controllers, Authentication Guards, DTOs, CSRF Anti-Forgery, Route Dispatchers)
       │
       ▼
[Domain / Business Layer](Entities, Validation Engine, Pipeline Calculators, Lead Conversion Workflow)
       │
       ▼
[Data Access Layer]      (Repositories, Parameterized SQL / Prepared Statements, Transaction Handling)
       │
       ▼
[Database Layer]         (SQLite ACID Engine, WAL Mode, Foreign Keys & Indices)

[Security & Cross-Cutting]: Immutable Audit Logging, Session/Cookie & JWT Auth, PBKDF2/Bcrypt Adaptive Hashing, Role-Based Access Control (RBAC)
```

---

## 2. Requirement Traceability Matrix

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

---

## 3. Pre-Seeded Default Accounts

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acxiomcrm.com` | `Admin@123` | Full application administration, user/role management, audit logs, all records and reports. |
| **Manager** | `manager@acxiomcrm.com` | `Manager@123` | Team pipeline monitoring, management reports, audit viewer. |
| **Sales Executive** | `sales@acxiomcrm.com` | `Sales@123` | Own assigned customers, leads, opportunities, follow-ups, and sales dashboard. |

---

## 4. Installation & Startup

### Prerequisites
- Node.js (v18.0.0 or later, tested on v24.14.0)
- npm (v9.0.0 or later)

### Quick Start
```bash
# 1. Navigate to the project directory
cd acxiom-crm

# 2. Install dependencies
npm install

# 3. Run the automated acceptance test suite (All 15 scenarios)
npm test

# 4. Start the application
npm start
```

Open your browser at **`http://localhost:3000`**.

---

## 5. Automated Acceptance Testing

Execute the test suite verifying all 14 scenarios from Section 17.19 of the assignment:

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

## 6. REST API Reference

All protected endpoints require either an active cookie session or a `Bearer <token>` HTTP header obtained from `/api/auth/login`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & retrieve JWT token |
| `POST` | `/api/auth/logout` | Terminate session |
| `GET` | `/api/customers` | List & search customers (DTO response) |
| `GET` | `/api/customers/:id` | Get customer details by ID |
| `POST` | `/api/customers` | Create new customer (with validation) |
| `PUT` | `/api/customers/:id` | Update customer |
| `DELETE` | `/api/customers/:id` | Delete customer |
| `GET` | `/api/leads` | List & filter leads |
| `GET` | `/api/leads/:id` | Get lead details |
| `POST` | `/api/leads` | Capture new lead |
| `PUT` | `/api/leads/:id` | Update lead |
| `DELETE` | `/api/leads/:id` | Delete lead |
| `GET` | `/api/opportunities` | List & filter sales opportunities |
| `GET` | `/api/opportunities/:id` | Get opportunity details |
| `POST` | `/api/opportunities` | Create opportunity (enforces business rules) |
| `PUT` | `/api/opportunities/:id` | Update opportunity |
| `DELETE` | `/api/opportunities/:id` | Delete opportunity |
| `GET` | `/api/followups` | List follow-ups |
| `POST` | `/api/followups` | Schedule new follow-up |
| `GET` | `/api/reports/pipeline` | Pipeline forecast data (Admin / Manager) |
