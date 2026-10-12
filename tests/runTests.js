/**
 * AcxiomCRM Automated Acceptance Test Suite
 * Strictly validates all 14 scenarios from PDF Section 17.19 & Section 13
 */

const assert = require('assert');
const http = require('http');
const app = require('../server');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const FollowUp = require('../models/FollowUp');
const AuditService = require('../services/auditService');
const Validator = require('../middleware/validation');
const { generateToken } = require('../middleware/auth');
const { db } = require('../config/database');

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let postData = null;
    if (body) {
      if (typeof body === 'object') {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      } else {
        postData = body;
      }
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' STARTING ACXIOMCRM ACCEPTANCE TEST EXECUTION');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
      failed++;
    }
  }

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Acceptance Scenario 1: Unauthenticated access blocked
    await test('Scenario 1: Protected pages redirect to /login or reject when unauthenticated', async () => {
      const resWeb = await makeRequest({ path: '/dashboard' });
      assert.strictEqual(resWeb.statusCode, 302, 'Web route should redirect');
      assert.ok(resWeb.headers.location.includes('/login'), 'Should redirect to /login');

      const resApi = await makeRequest({ path: '/api/customers' });
      assert.strictEqual(resApi.statusCode, 401, 'API should return 401 Unauthorized');
      assert.strictEqual(resApi.json.success, false);
    });

    // 2. Acceptance Scenario 2: Valid Authentication
    let adminToken, salesToken, managerToken;
    let adminUser, salesUser, managerUser;

    await test('Scenario 2: Valid authentication succeeds and returns JWT', async () => {
      const loginRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'admin@acxiomcrm.com', password: 'Admin@123' }
      });
      assert.strictEqual(loginRes.statusCode, 200);
      assert.ok(loginRes.json.token, 'Token must be returned');
      adminToken = loginRes.json.token;
      adminUser = loginRes.json.user;

      const salesRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'sales@acxiomcrm.com', password: 'Sales@123' }
      });
      assert.strictEqual(salesRes.statusCode, 200);
      salesToken = salesRes.json.token;
      salesUser = salesRes.json.user;

      const managerRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'manager@acxiomcrm.com', password: 'Manager@123' }
      });
      assert.strictEqual(managerRes.statusCode, 200);
      managerToken = managerRes.json.token;
      managerUser = managerRes.json.user;
    });

    // 3. Acceptance Scenario 3 & 4: Customer Validation (Email & Phone format & uniqueness)
    await test('Scenario 3 & 4: Server-side validation rejects invalid email and phone', async () => {
      const invalidCustomerRes = await makeRequest({
        method: 'POST',
        path: '/api/customers',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          CustomerName: 'Test Corp',
          Email: 'invalid-email-address',
          Phone: '123' // Not 10 digits
        }
      });
      assert.strictEqual(invalidCustomerRes.statusCode, 400);
      assert.ok(invalidCustomerRes.json.errors.some(e => e.includes('email')), 'Should reject email');
      assert.ok(invalidCustomerRes.json.errors.some(e => e.includes('phone')), 'Should reject phone');
    });

    // 4. Duplicate customer detection
    await test('Scenario 4b: Duplicate email/phone customer creation is blocked', async () => {
      const dupRes = await makeRequest({
        method: 'POST',
        path: '/api/customers',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          CustomerName: 'Duplicate Corp',
          Email: 'contact@apexcloud.io', // Already in seed data
          Phone: '9999999999'
        }
      });
      assert.strictEqual(dupRes.statusCode, 400);
      assert.ok(dupRes.json.errors.some(e => e.includes('already exists')));
    });

    // 5. Acceptance Scenario 5: Opportunity Amount <= 0 is rejected
    await test('Scenario 5: Opportunity with Amount <= 0 is rejected', async () => {
      const oppZeroRes = await makeRequest({
        method: 'POST',
        path: '/api/opportunities',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          OpportunityName: 'Invalid Deal',
          CustomerId: 1,
          Amount: 0,
          Probability: 50,
          ExpectedCloseDate: '2026-12-31'
        }
      });
      assert.strictEqual(oppZeroRes.statusCode, 400);
      assert.ok(oppZeroRes.json.errors.some(e => e.includes('greater than 0')));
    });

    // 6. Acceptance Scenario 6: Opportunity Probability > 100 is rejected
    await test('Scenario 6: Opportunity with Probability > 100 is rejected', async () => {
      const oppProbRes = await makeRequest({
        method: 'POST',
        path: '/api/opportunities',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          OpportunityName: 'Overconfident Deal',
          CustomerId: 1,
          Amount: 10000,
          Probability: 150,
          ExpectedCloseDate: '2026-12-31'
        }
      });
      assert.strictEqual(oppProbRes.statusCode, 400);
      assert.ok(oppProbRes.json.errors.some(e => e.includes('between 0 and 100')));
    });

    // 7. Acceptance Scenario 7: Opportunity Expected Close Date in past is rejected
    await test('Scenario 7: Opportunity with Expected Close Date in the past is rejected', async () => {
      const oppPastRes = await makeRequest({
        method: 'POST',
        path: '/api/opportunities',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          OpportunityName: 'Time Travel Deal',
          CustomerId: 1,
          Amount: 25000,
          Probability: 50,
          ExpectedCloseDate: '2020-01-01' // Past date
        }
      });
      assert.strictEqual(oppPastRes.statusCode, 400);
      assert.ok(oppPastRes.json.errors.some(e => e.includes('cannot be in the past')));
    });

    // 8. Acceptance Scenario 8: Follow-Up Date before today is rejected
    await test('Scenario 8: New follow-up dated before today is rejected', async () => {
      const followUpPastRes = await makeRequest({
        method: 'POST',
        path: '/api/followups',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          Subject: 'Past Follow-Up',
          CustomerId: 1,
          FollowUpDate: '2020-01-01' // Past date
        }
      });
      assert.strictEqual(followUpPastRes.statusCode, 400);
      assert.ok(followUpPastRes.json.errors.some(e => e.includes('cannot be earlier than today')));
    });

    // 9. Acceptance Scenario 9: Role-based scoping for SalesExecutive
    await test('Scenario 9: SalesExecutive can only view/manage assigned CRM records', async () => {
      const salesCustomersRes = await makeRequest({
        path: '/api/customers',
        headers: { 'Authorization': `Bearer ${salesToken}` }
      });
      assert.strictEqual(salesCustomersRes.statusCode, 200);
      // All returned customers must belong to the sales executive
      const allAssigned = salesCustomersRes.json.data.every(c => c.ownerName === salesUser.name);
      assert.ok(allAssigned, 'Sales executive must only see assigned customer records');
    });

    // 10. Acceptance Scenario 10: Manager pipeline access & reports
    await test('Scenario 10: Manager has access to team pipeline data', async () => {
      const pipelineRes = await makeRequest({
        path: '/api/reports/pipeline',
        headers: { 'Authorization': `Bearer ${managerToken}` }
      });
      assert.strictEqual(pipelineRes.statusCode, 200);
      assert.ok(pipelineRes.json.data.stageData, 'Stage data should be present');
      assert.ok(pipelineRes.json.data.ownerData, 'Owner data should be present');
    });

    // 11. Acceptance Scenario 11: Admin user management and governance
    await test('Scenario 11: Only Admin can access User Management & Governance', async () => {
      // Sales executive accessing /users should be rejected with 403
      const forbiddenRes = await makeRequest({
        path: '/users',
        headers: { 'Cookie': `acxiom_token=${salesToken}` }
      });
      assert.strictEqual(forbiddenRes.statusCode, 403, 'Sales executive must be forbidden from /users');

      // Admin accessing /users should succeed
      const adminUsersRes = await makeRequest({
        path: '/users',
        headers: { 'Cookie': `acxiom_token=${adminToken}` }
      });
      assert.strictEqual(adminUsersRes.statusCode, 200, 'Admin can access /users');
    });

    // 12. Acceptance Scenario 12: Audit Logging on CRM mutations
    await test('Scenario 12: CRM operations generate immutable audit log entries', async () => {
      const initialLogCount = AuditService.getLogCount();
      
      // Create a valid customer via API
      const newCustRes = await makeRequest({
        method: 'POST',
        path: '/api/customers',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: {
          CustomerName: 'Audit Verified Systems',
          Email: `audit.test.${Date.now()}@acxiom.com`,
          Phone: '9988776655',
          CompanyName: 'Audit Test Corp'
        }
      });
      assert.strictEqual(newCustRes.statusCode, 201);

      const afterLogCount = AuditService.getLogCount();
      assert.ok(afterLogCount > initialLogCount, 'Audit log count must increase');

      const latestLog = AuditService.getLogs({ limit: 1 })[0];
      assert.strictEqual(latestLog.EntityName, 'Customer');
      assert.strictEqual(latestLog.Action, 'Create');
    });

    // 13. Acceptance Scenario 13: REST API customer listing returns authorized JSON
    await test('Scenario 13: GET /api/customers returns authorized JSON with DTOs', async () => {
      const apiCust = await makeRequest({
        path: '/api/customers',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(apiCust.statusCode, 200);
      assert.ok(Array.isArray(apiCust.json.data));
      // DTO check: PasswordHash must never be present
      assert.strictEqual(apiCust.json.data[0].PasswordHash, undefined);
    });

    // 14. Acceptance Scenario 14: Lead Conversion workflow
    await test('Scenario 14: Lead-to-Customer conversion workflow executes atomically', async () => {
      // 1. Create a qualified lead
      const newLeadId = Lead.create({
        LeadName: 'Conversion Candidate',
        Email: `convert.${Date.now()}@prospect.com`,
        Phone: '9112233445',
        CompanyName: 'Converted Prospect Inc',
        ExpectedValue: 120000,
        Status: 'Qualified'
      }, adminUser);

      // 2. Convert lead
      const convResult = Lead.convertLead(newLeadId, {
        createOpportunity: true,
        opportunityAmount: 120000,
        expectedCloseDate: '2026-11-30'
      }, adminUser);

      assert.strictEqual(convResult.success, true);
      assert.ok(convResult.customerId, 'Customer ID should be created');
      assert.ok(convResult.opportunityId, 'Opportunity ID should be created');

      const convertedLead = Lead.findById(newLeadId);
      assert.strictEqual(convertedLead.Status, 'Converted');
    });

    // 15. Security: Account Lockout after 5 failed logins
    await test('Security: 5 consecutive failed logins trigger Account Lockout', async () => {
      const testEmail = 'lockout.target@acxiomcrm.com';
      User.create({
        name: 'Lockout Target',
        email: testEmail,
        password: 'ValidPassword@123',
        role: 'SalesExecutive'
      });

      // Attempt 5 bad passwords
      for (let i = 1; i <= 5; i++) {
        const res = User.authenticate(testEmail, 'WrongPassword@999');
        if (i < 5) {
          assert.strictEqual(res.success, false);
          assert.strictEqual(res.isLocked, undefined);
        } else {
          // 5th attempt must lock
          assert.strictEqual(res.success, false);
          assert.strictEqual(res.isLocked, true);
        }
      }

      // 6th attempt should also be locked
      const sixthAttempt = User.authenticate(testEmail, 'ValidPassword@123');
      assert.strictEqual(sixthAttempt.success, false);
      assert.strictEqual(sixthAttempt.isLocked, true);
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n======================================================');
  console.log(` TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite().catch(err => {
    console.error('Test execution fatal error:', err);
    process.exit(1);
  });
}

module.exports = runTestSuite;
