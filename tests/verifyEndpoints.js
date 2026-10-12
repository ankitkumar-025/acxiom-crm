const http = require('http');

async function checkLiveEndpoints() {
  console.log('Testing Live Running Server on http://localhost:3000 ...\n');

  // 1. Get Login page and extract CSRF token and cookie
  const loginRes = await new Promise((resolve) => {
    http.get('http://localhost:3000/login', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
  });

  console.log(`[1] GET /login -> Status ${loginRes.status}`);
  if (!loginRes.data.includes('AcxiomCRM')) throw new Error('Missing AcxiomCRM brand in login page');
  if (!loginRes.data.includes('Sign In to Dashboard')) throw new Error('Missing Sign In button');

  // Extract cookies
  const cookies = loginRes.headers['set-cookie'] || [];
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

  // 2. Perform API Login as Admin
  const authRes = await new Promise((resolve) => {
    const postData = JSON.stringify({ email: 'admin@acxiomcrm.com', password: 'Admin@123' });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    req.write(postData);
    req.end();
  });

  console.log(`[2] POST /api/auth/login -> Status ${authRes.status}, User: ${authRes.json.user.name} (${authRes.json.user.role})`);
  const token = authRes.json.token;
  const authCookie = `acxiom_token=${token}; ${cookieHeader}`;

  // 3. Test authenticated pages
  const routesToTest = [
    { path: '/dashboard', label: 'Dashboard', expect: 'Executive Sales Performance' },
    { path: '/customers', label: 'Customers List', expect: 'Customer Accounts' },
    { path: '/customers/1', label: 'Customer Details', expect: 'Customer History & Activity Timeline' },
    { path: '/leads', label: 'Leads Pipeline', expect: 'Lead Pipeline' },
    { path: '/leads/1', label: 'Lead Details', expect: 'Estimated Deal Value' },
    { path: '/opportunities', label: 'Opportunities', expect: 'Sales Opportunities & Pipeline' },
    { path: '/opportunities/1', label: 'Opportunity Details', expect: 'Win Probability' },
    { path: '/followups', label: 'Follow-Ups', expect: 'Follow-Up Management' },
    { path: '/activities', label: 'Activities', expect: 'Activity Management' },
    { path: '/reports', label: 'Reports Hub', expect: 'Reporting Hub & Analytics' },
    { path: '/reports/customers', label: 'Customer Report', expect: 'Customer Summary Report' },
    { path: '/reports/pipeline', label: 'Pipeline Report', expect: 'Stage-Wise Pipeline Volume' },
    { path: '/users', label: 'User Management (Admin)', expect: 'User & Role Management' },
    { path: '/audit', label: 'Audit Trail (Admin)', expect: 'Audit Trail & Governance Logs' },
    { path: '/profile', label: 'User Profile', expect: 'Change Password' }
  ];

  for (const r of routesToTest) {
    const res = await new Promise((resolve) => {
      http.get({
        hostname: 'localhost',
        port: 3000,
        path: r.path,
        headers: { 'Cookie': authCookie }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
    });

    if (res.status === 200 && res.data.includes(r.expect)) {
      console.log(`  [OK] ${r.path.padEnd(22)} (${r.label}) -> Status 200, Verified text`);
    } else {
      throw new Error(`Failed check on ${r.path}: Status ${res.status}`);
    }
  }

  // 4. Test CSV Export endpoint
  const csvRes = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/reports/customers/export',
      headers: { 'Cookie': authCookie }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
  });

  if (csvRes.status === 200 && csvRes.headers['content-type'].includes('text/csv')) {
    console.log(`  [OK] /reports/customers/export -> Status 200, Content-Type text/csv (${csvRes.data.split('\n').length} rows)`);
  } else {
    throw new Error('CSV Export check failed');
  }

  console.log('\nAll 17 live web routes and export endpoints verified successfully!');
}

checkLiveEndpoints().catch(err => {
  console.error('Endpoint verification failed:', err);
  process.exit(1);
});
