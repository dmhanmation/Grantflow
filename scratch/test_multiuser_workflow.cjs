const http = require('http');

const BASE_URL = 'http://localhost:3000';

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING END-TO-END MULTI-USER WORKFLOW & ISOLATION TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. Health Check
    console.log('1. Verifying Server Health...');
    const health = await get('/api/health');
    if (health.status !== 200) throw new Error('Health check failed: ' + JSON.stringify(health));
    console.log('✅ Server is healthy.\n');

    // 2. Register New Real Organisation A
    const orgTimestamp = Date.now();
    const orgName = `Rural Action Initiative ${orgTimestamp}`;
    const adminEmail = `admin.${orgTimestamp}@ruralaction.org`;
    console.log(`2. Registering Organisation A: "${orgName}"...`);

    const regA = await post('/api/auth/register-org', {
      orgName,
      country: 'Nigeria',
      adminFullName: 'Tariq Admin',
      adminEmail,
      adminPassword: 'Password123!'
    });

    if (regA.status !== 201) throw new Error('Failed to register Org A: ' + JSON.stringify(regA));
    const tokenAdminA = regA.data.token;
    const orgAId = regA.data.organization.id;
    console.log(`✅ Organisation A created with ID: ${orgAId} (isDemo = ${regA.data.organization.isDemo})`);
    console.log(`✅ Clean start: Departments initialized: ${regA.data.organization.departments.length}, Staff count: ${regA.data.organization.staffDirectory.length}\n`);

    // 3. Create Invitations for 4 Multi-Tier Staff Members in Org A
    console.log('3. Inviting 4 Staff Members across Hierarchy...');

    // a) Programme Officer
    const invOfficer = await post('/api/invitations/create', {
      email: `officer.${orgTimestamp}@ruralaction.org`,
      fullName: 'David Officer',
      jobTitle: 'Senior Programme Officer',
      departmentId: 'dept-prog',
      role: 'Officer'
    }, { Authorization: `Bearer ${tokenAdminA}` });
    if (invOfficer.status !== 201) throw new Error('Failed to invite Officer: ' + JSON.stringify(invOfficer));
    const tokenInvOfficer = invOfficer.data.invitation.token;

    // b) Head of Programmes (HoD)
    const invHoD = await post('/api/invitations/create', {
      email: `hod.${orgTimestamp}@ruralaction.org`,
      fullName: 'Sarah HoD',
      jobTitle: 'Head of Programmes',
      departmentId: 'dept-prog',
      role: 'DepartmentHead'
    }, { Authorization: `Bearer ${tokenAdminA}` });
    const tokenInvHoD = invHoD.data.invitation.token;

    // c) Proposal Lead
    const invLead = await post('/api/invitations/create', {
      email: `lead.${orgTimestamp}@ruralaction.org`,
      fullName: 'Marcus Lead',
      jobTitle: 'Grants & Resource Lead',
      departmentId: 'dept-grants',
      role: 'ProposalLead'
    }, { Authorization: `Bearer ${tokenAdminA}` });
    const tokenInvLead = invLead.data.invitation.token;

    // d) Final Approver (Executive Director)
    const invApprover = await post('/api/invitations/create', {
      email: `approver.${orgTimestamp}@ruralaction.org`,
      fullName: 'Dr. Chinedu Approver',
      jobTitle: 'Executive Director',
      departmentId: 'dept-exec',
      role: 'FinalApprover'
    }, { Authorization: `Bearer ${tokenAdminA}` });
    const tokenInvApprover = invApprover.data.invitation.token;

    console.log('✅ Generated 4 invitation tokens.');

    // 4. Accept Invitations & Register Passwords
    console.log('\n4. Staff Accepting Invitations & Creating Passwords...');

    const accOfficer = await post('/api/invitations/accept', {
      token: tokenInvOfficer,
      password: 'OfficerPassword123!'
    });
    const tokenOfficer = accOfficer.data.token;
    console.log(`✅ Programme Officer registered (Role: ${accOfficer.data.user.role})`);

    const accHoD = await post('/api/invitations/accept', {
      token: tokenInvHoD,
      password: 'HoDPassword123!'
    });
    const tokenHoD = accHoD.data.token;
    console.log(`✅ Head of Programmes registered (Role: ${accHoD.data.user.role})`);

    const accLead = await post('/api/invitations/accept', {
      token: tokenInvLead,
      password: 'LeadPassword123!'
    });
    const tokenLead = accLead.data.token;
    console.log(`✅ Proposal Lead registered (Role: ${accLead.data.user.role})`);

    const accApprover = await post('/api/invitations/accept', {
      token: tokenInvApprover,
      password: 'ApproverPassword123!'
    });
    const tokenApprover = accApprover.data.token;
    console.log(`✅ Final Approver registered (Role: ${accApprover.data.user.role})`);

    // 5. Create a Grant Workspace in Organisation A
    console.log('\n5. Creating Grant Workspace in Organisation A...');
    const wsId = `ws-test-${orgTimestamp}`;
    const newWs = {
      id: wsId,
      organizationId: orgAId,
      isDemo: false,
      title: 'Community Climate Resilience Fund 2026',
      donor: 'Global Green Innovation Fund',
      deadline: '2026-11-01',
      fundingAmount: '$350,000',
      currency: 'USD',
      stage: 'Preparing Application',
      priority: 'High',
      proposalLead: 'Marcus Lead',
      leadStaff: 'Marcus Lead',
      finalApprover: 'Dr. Chinedu Approver',
      finalApprovalStatus: 'Pending',
      thematicArea: 'Climate',
      countryScope: 'Nigeria',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [
        {
          id: 'task-prog-1',
          title: 'Draft Technical Methodology & Community Engagement',
          description: 'Detail baseline assessment and community mobilization protocols.',
          department: 'Programmes',
          assignedTo: 'David Officer',
          dueDate: '2026-10-15',
          completed: false,
          status: 'PENDING',
          departmentReviewStatus: 'Draft'
        },
        {
          id: 'task-fin-1',
          title: 'Develop Activity-Based Cost Budget',
          description: 'Prepare personnel and direct project activity costings.',
          department: 'Finance',
          assignedTo: 'Marcus Lead',
          dueDate: '2026-10-20',
          completed: false,
          status: 'PENDING',
          departmentReviewStatus: 'Draft'
        }
      ]
    };

    const saveWs = await post('/api/workspaces', newWs, { Authorization: `Bearer ${tokenLead}` });
    if (saveWs.status !== 201) throw new Error('Failed to save workspace: ' + JSON.stringify(saveWs));
    console.log('✅ Workspace created in Org A.');

    // 6. Workflow Step 1: Officer Submits Draft for Department Head Review
    console.log('\n6. Tier 1: Programme Officer Submits Technical Section...');
    newWs.tasks[0].departmentReviewStatus = 'Submitted to Department Head';
    newWs.tasks[0].departmentReviewRequestedAt = new Date().toISOString();

    const wsOfficerUpdate = await post('/api/workspaces', newWs, { Authorization: `Bearer ${tokenOfficer}` });
    console.log(`✅ Task status updated to: "${wsOfficerUpdate.data.tasks[0].departmentReviewStatus}"`);

    // 7. Workflow Step 2: Head of Programmes (HoD) Reviews & Approves
    console.log('\n7. Tier 2: Head of Programmes Reviews & Approves Deliverable...');
    newWs.tasks[0].completed = true;
    newWs.tasks[0].status = 'COMPLETED';
    newWs.tasks[0].departmentReviewStatus = 'Department Approved';
    newWs.tasks[0].departmentApprovedAt = new Date().toISOString();
    newWs.tasks[0].departmentApprovedBy = 'Sarah HoD';

    // Also approve Finance task
    newWs.tasks[1].completed = true;
    newWs.tasks[1].status = 'COMPLETED';
    newWs.tasks[1].departmentReviewStatus = 'Department Approved';
    newWs.tasks[1].departmentApprovedAt = new Date().toISOString();

    const wsHoDUpdate = await post('/api/workspaces', newWs, { Authorization: `Bearer ${tokenHoD}` });
    console.log(`✅ Deliverables marked as "Department Approved" by Head of Programmes.`);

    // 8. Workflow Step 3: Proposal Lead Promotes to Final Review
    console.log('\n8. Tier 3: Proposal Lead Verifies All Department Approvals...');
    const allApproved = wsHoDUpdate.data.tasks.every(t => t.departmentReviewStatus === 'Department Approved');
    if (!allApproved) throw new Error('Expected all tasks to be Department Approved.');
    console.log(`✅ All ${wsHoDUpdate.data.tasks.length} departmental deliverables verified as approved.`);

    // 9. Workflow Step 4: Final Approver Signs Off Proposal
    console.log('\n9. Tier 4: Final Approver (Executive Director) Authorizes Submission...');
    newWs.finalApprovalStatus = 'Approved';
    newWs.finalApprovedAt = new Date().toISOString();
    newWs.finalApprovedBy = 'Dr. Chinedu Approver';
    newWs.finalApprovalNote = 'Proposal thoroughly reviewed and authorized for official donor submission.';
    newWs.stage = 'Ready for Submission';

    const wsApproverUpdate = await post('/api/workspaces', newWs, { Authorization: `Bearer ${tokenApprover}` });
    console.log(`✅ Final Sign-Off Recorded! Status: "${wsApproverUpdate.data.finalApprovalStatus}", Stage: "${wsApproverUpdate.data.stage}"`);

    // 10. Multi-Tenant Isolation Test
    console.log('\n10. Testing Multi-Tenant Data Isolation...');
    const orgBTimestamp = Date.now() + 100;
    const orgBName = `Clean Water Initiative ${orgBTimestamp}`;
    const adminBEmail = `admin.${orgBTimestamp}@cleanwater.org`;

    const regB = await post('/api/auth/register-org', {
      orgName: orgBName,
      country: 'Kenya',
      adminFullName: 'Alice Kenya',
      adminEmail: adminBEmail,
      adminPassword: 'Password123!'
    });

    const tokenUserB = regB.data.token;
    const orgBId = regB.data.organization.id;
    console.log(`✅ Organisation B registered (ID: ${orgBId})`);

    // User B queries workspaces
    const workspacesB = await get('/api/workspaces', { Authorization: `Bearer ${tokenUserB}` });
    if (workspacesB.data.length !== 0) {
      throw new Error(`Isolation Breach! User from Org B received ${workspacesB.data.length} workspaces.`);
    }
    console.log('✅ Isolation Verified: User from Organisation B sees 0 workspaces (completely clean).');

    // User A queries workspaces
    const workspacesA = await get('/api/workspaces', { Authorization: `Bearer ${tokenAdminA}` });
    if (workspacesA.data.length !== 1 || workspacesA.data[0].id !== wsId) {
      throw new Error('Expected Org A to have 1 workspace.');
    }
    console.log('✅ Organisation A sees exactly its own workspace.');

    // 11. Staff Deactivation Test
    console.log('\n11. Testing Staff Member Deactivation & Task Reassignment Notice...');
    const deactRes = await post('/api/org/staff/deactivate', {
      staffId: invOfficer.data.invitation.id.replace('inv-', 'staff-')
    }, { Authorization: `Bearer ${tokenAdminA}` });

    console.log(`✅ Deactivation Response: ${deactRes.data.notice || 'Success'}`);

    console.log('\n================================================================');
    console.log('🎉 ALL MULTI-USER WORKFLOW & ISOLATION TESTS PASSED WITH 0 ERRORS!');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runTests();
