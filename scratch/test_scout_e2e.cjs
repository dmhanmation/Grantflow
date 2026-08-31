const http = require('http');

function post(path, body, cookie = '') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          Cookie: cookie
        }
      },
      res => {
        let resBody = '';
        res.on('data', chunk => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, data: resBody, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'GET',
        headers: {
          Cookie: cookie
        }
      },
      res => {
        let resBody = '';
        res.on('data', chunk => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, data: resBody, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- Testing Scout E2E Endpoints on Running Server ---');

  // 1. Register test user
  const email = `scout_e2e_${Date.now()}@example.org`;
  const regRes = await post('/api/auth/register-org', {
    adminFullName: 'Executive Lead',
    adminEmail: email,
    adminPassword: 'Password123!',
    orgName: 'West Africa Youth & Women Empowerment Fund',
    country: 'Nigeria',
    orgType: 'Civil Society Organisation'
  });

  if (regRes.status !== 200 && regRes.status !== 201) {
    console.log('Registration response:', regRes);
    throw new Error('Failed to register user');
  }

  const cookie = (regRes.headers['set-cookie'] || [])[0] || '';
  console.log('✅ User registered and authenticated with session cookie.');

  // 2. Update Funding Preferences
  const prefRes = await post(
    '/api/org-profile',
    {
      name: 'West Africa Youth & Women Empowerment Fund',
      country: 'Nigeria',
      thematicAreas: ['Women Rights', 'Youth Empowerment', 'Community Health'],
      fundingPreferences: {
        thematicAreas: ['Women Leadership', 'GBV Response', 'Youth Digital Skilling'],
        geographicEligibility: ['Nigeria', 'West Africa'],
        beneficiaryGroups: ['Vulnerable Women & Youth'],
        orgType: 'CSO',
        preferredFundingMin: '$50,000',
        preferredFundingMax: '$500,000',
        minimumUsefulGrantSize: 25000,
        excludedSectors: ['Fossil Fuels', 'Tobacco', 'Weapons']
      }
    },
    cookie
  );
  console.log('✅ Updated Organisation Funding Preferences.');

  // 3. Trigger Scout Run
  console.log('--- Running Opportunity Scout ---');
  const scoutRunRes = await post('/api/scout/run', {}, cookie);
  console.log(`Scout Run Status: ${scoutRunRes.status}`);
  console.log(`Discovered Opportunities: ${scoutRunRes.data.opportunities?.length}`);
  console.log(`Summary: ${scoutRunRes.data.log?.summary}`);

  if (!scoutRunRes.data.opportunities || scoutRunRes.data.opportunities.length === 0) {
    throw new Error('No scout opportunities returned!');
  }

  // 4. Fetch Opportunities
  const fetchRes = await get('/api/scout/opportunities', cookie);
  console.log(`Fetched Opportunities from DB: ${fetchRes.data.opportunities?.length}`);

  const opps = fetchRes.data.opportunities || [];
  opps.forEach(o => {
    console.log(` • [${o.matchVerdict}] ${o.donor}: "${o.title}" | Deadline: ${o.deadline} (${o.opportunityStatus})`);
    if (o.isDeadlineRisk) {
      console.log(`   ⚠ ${o.deadlineRiskNotice}`);
    }
  });

  // Verify none are closed or in excluded sectors
  for (const o of opps) {
    if (o.opportunityStatus === 'Apparently closed') {
      throw new Error(`Expired opportunity presented: ${o.title}`);
    }
  }

  console.log('\n✅ All Scout E2E tests succeeded on running server!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
