import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Admin Dashboard and Employee Management APIs & Security Boundaries', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner / Admin
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer

  let createdEmployeeId = null;
  let createdInvitationId = null;

  // ---------------------------------------------------------
  // 1. Employee Creation & Validation
  // ---------------------------------------------------------
  await t.test('1.1 Allows Manager or Admin to create a new workforce member', async () => {
    const payload = {
      employee_code: `EMP-TEST-${Date.now().toString().slice(-4)}`,
      first_name: 'Elena',
      last_name: 'Rostova',
      email: `elena.${Date.now()}@acme.com`,
      phone: '+1-555-0199',
      department: 'Fleet Operations',
      department_id: 'dept-acme-1',
      designation: 'Safety Compliance Officer',
      employment_type: 'full_time',
      status: 'active',
      hourly_rate: 48.5,
      skills: ['OSHA Inspection', 'Telematics']
    };

    const res = await request(app)
      .post('/api/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.first_name, 'Elena');
    assert.equal(res.body.data.department, 'Fleet Operations');
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);

    createdEmployeeId = res.body.data.id;
  });

  await t.test('1.2 Rejects employee creation with validation error on invalid input', async () => {
    const invalidPayload = {
      // missing employee_code, first_name, last_name, and valid email
      email: 'not-an-email',
      hourly_rate: -10
    };

    const res = await request(app)
      .post('/api/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test(
    '1.3 Rejects employee creation by employee or customer role with 403 Forbidden',
    async () => {
      const payload = {
        employee_code: 'EMP-UNAUTH-1',
        first_name: 'Intruder',
        last_name: 'User',
        email: 'intruder@acme.com',
        department: 'Fleet Operations'
      };

      const resEmployee = await request(app)
        .post('/api/workforce')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send(payload);

      assert.equal(resEmployee.status, 403);

      const resCustomer = await request(app)
        .post('/api/workforce')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send(payload);

      assert.equal(resCustomer.status, 403);
    }
  );

  await t.test(
    '1.4 Enforces tenant isolation: Acme Admin cannot access Apex workforce',
    async () => {
      const res = await request(app)
        .get('/api/workforce')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  );

  // ---------------------------------------------------------
  // 2. Workforce Directory Listing, Search & Filtering
  // ---------------------------------------------------------
  await t.test('2.1 Lists workforce directory with pagination metadata', async () => {
    const res = await request(app)
      .get('/api/workforce?page=1&limit=10')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.meta?.pagination);
    assert.equal(res.body.meta.pagination.page, 1);
  });

  await t.test('2.2 Filters workforce by department', async () => {
    const res = await request(app)
      .get('/api/workforce?department=Fleet Operations')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    res.body.data.forEach((member) => {
      assert.equal(member.department, 'Fleet Operations');
    });
  });

  await t.test('2.3 Filters workforce by search query matching name or employee code', async () => {
    const res = await request(app)
      .get('/api/workforce?search=Elena')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((m) => m.first_name === 'Elena'));
  });

  await t.test('2.4 Retrieves operational workforce statistics', async () => {
    const res = await request(app)
      .get('/api/workforce/stats')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.totalStaff === 'number');
    assert.ok(typeof res.body.data.activeStaff === 'number');
    assert.ok(typeof res.body.data.departmentCount === 'number');
  });

  // ---------------------------------------------------------
  // 3. Employee Detail Retrieval
  // ---------------------------------------------------------
  await t.test('3.1 Retrieves employee profile by ID', async () => {
    assert.ok(createdEmployeeId, 'createdEmployeeId must be defined');

    const res = await request(app)
      .get(`/api/workforce/${createdEmployeeId}`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdEmployeeId);
    assert.equal(res.body.data.first_name, 'Elena');
  });

  await t.test('3.2 Returns 404 for non-existent employee ID', async () => {
    const res = await request(app)
      .get('/api/workforce/non-existent-employee-id')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 404);
  });

  // ---------------------------------------------------------
  // 4. Employee Details Update
  // ---------------------------------------------------------
  await t.test('4.1 Updates employee details successfully', async () => {
    const updatePayload = {
      designation: 'Senior Fleet Inspector',
      hourly_rate: 55.0
    };

    const res = await request(app)
      .patch(`/api/workforce/${createdEmployeeId}`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(updatePayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.designation, 'Senior Fleet Inspector');
    assert.equal(Number(res.body.data.hourly_rate), 55.0);
  });

  // ---------------------------------------------------------
  // 5. Department Reassignment & Manager Assignment
  // ---------------------------------------------------------
  await t.test('5.1 Reassigns employee department', async () => {
    const res = await request(app)
      .patch(`/api/workforce/${createdEmployeeId}/department`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        department_id: 'dept-acme-3',
        department: 'Field Operations'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.department_id, 'dept-acme-3');
    assert.equal(res.body.data.department, 'Field Operations');
  });

  await t.test('5.2 Assigns manager to employee', async () => {
    const res = await request(app)
      .patch(`/api/workforce/${createdEmployeeId}/manager`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        manager_id: 'w1'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.manager_id, 'w1');
  });

  // ---------------------------------------------------------
  // 6. Role Management & Role Elevation Boundaries
  // ---------------------------------------------------------
  await t.test('6.1 Manager cannot change employee role (403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/workforce/w1/role')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ role: 'manager' });

    assert.equal(res.status, 403);
  });

  await t.test('6.2 Admin / Owner is permitted to update employee role', async () => {
    const res = await request(app)
      .patch('/api/workforce/w1/role')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ role: 'manager' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.newRole, 'manager');
  });

  // ---------------------------------------------------------
  // 7. Membership Invitations Lifecycle
  // ---------------------------------------------------------
  await t.test('7.1 Manager cannot dispatch invitations (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/organizations/invitations')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        email: 'newbie@acme.com',
        role: 'employee'
      });

    assert.equal(res.status, 403);
  });

  await t.test('7.2 Admin creates and dispatches a membership invitation', async () => {
    const inviteEmail = `invite-${Date.now()}@acme.com`;
    const res = await request(app)
      .post('/api/organizations/invitations')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        email: inviteEmail,
        role: 'employee',
        department_id: 'dept-acme-1'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, inviteEmail);
    assert.equal(res.body.data.status, 'pending');

    createdInvitationId = res.body.data.id;
  });

  await t.test('7.3 Lists pending invitations for tenant organization', async () => {
    const res = await request(app)
      .get('/api/organizations/invitations')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((inv) => inv.id === createdInvitationId));
  });

  await t.test('7.4 Revokes a pending membership invitation', async () => {
    assert.ok(createdInvitationId, 'createdInvitationId must be defined');

    const res = await request(app)
      .delete(`/api/organizations/invitations/${createdInvitationId}`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'revoked');
  });

  // ---------------------------------------------------------
  // 8. Employee Deactivation
  // ---------------------------------------------------------
  await t.test('8.1 Deactivates workforce member', async () => {
    const res = await request(app)
      .delete(`/api/workforce/${createdEmployeeId}`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'terminated');
  });

  // ---------------------------------------------------------
  // 9. Organization Settings & User Profile Management
  // ---------------------------------------------------------
  await t.test('9.1 Admin updates current organization details', async () => {
    const res = await request(app)
      .patch('/api/organizations/current')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        name: 'Acme Logistics Global Enterprise'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Acme Logistics Global Enterprise');
  });

  await t.test('9.2 Admin updates current organization settings', async () => {
    const res = await request(app)
      .patch('/api/organizations/current/settings')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        currency: 'USD',
        theme: 'dark'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currency, 'USD');
  });

  await t.test('9.3 User updates their personal profile information', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', ALEX_TOKEN)
      .send({
        full_name: 'Alex Rivera Senior',
        phone: '+1-555-0100'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.full_name, 'Alex Rivera Senior');
    assert.equal(res.body.data.phone, '+1-555-0100');
  });
});
