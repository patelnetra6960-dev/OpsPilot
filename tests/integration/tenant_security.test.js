import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';
import { mockDatabase } from '../../server/src/config/supabase.js';

test('Integration Test: Multi-Tenant Boundary Enforcement & Operations', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer
  const SUPERADMIN_TOKEN = 'Bearer mock-token-superadmin'; // Platform Super Admin

  await t.test('Prevents cross-tenant access with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/workforce')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  await t.test('Permits valid tenant access with 100% data isolation', async () => {
    const res = await request(app)
      .get('/api/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3);
    res.body.data.forEach((member) => {
      assert.equal(member.organization_id, ACME_TENANT_ID);
    });

    const resApex = await request(app)
      .get('/api/workforce')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID);

    assert.equal(resApex.status, 200);
    assert.equal(resApex.body.data.length, 2);
  });

  await t.test('Allows adding a new workforce member strictly to the active tenant', async () => {
    const newMemberPayload = {
      employee_code: 'EMP-ACME-999',
      first_name: 'Jordan',
      last_name: 'Lee',
      email: 'jordan.l@acme.com',
      department: 'Fleet Operations',
      designation: 'Dispatcher Trainee',
      employment_type: 'full_time',
      hourly_rate: 30.0
    };

    const res = await request(app)
      .post('/api/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(newMemberPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);
    assert.equal(res.body.data.employee_code, 'EMP-ACME-999');
  });

  await t.test('Validation Guard: Rejects workforce creation with invalid email', async () => {
    const invalidPayload = {
      employee_code: 'EMP-ACME-BAD',
      first_name: 'Invalid',
      last_name: 'User',
      email: 'not-an-email'
    };

    const res = await request(app)
      .post('/api/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('Allows creating a new organization and assigns creator as owner', async () => {
    const orgPayload = {
      name: 'Vanguard Field Logistics',
      slug: 'vanguard-field',
      subscription_tier: 'growth'
    };

    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', ALEX_TOKEN)
      .send(orgPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Vanguard Field Logistics');
    assert.equal(res.body.data.role, 'owner');
  });

  await t.test('Error Middleware: Returns 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/non-existent-route');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  await t.test(
    'Soft Deletion: Soft-deleted workforce members are excluded from active list',
    async () => {
      // Add temporary soft-deleted member
      mockDatabase.workforce.push({
        id: 'wm-deleted-test',
        organization_id: ACME_TENANT_ID,
        employee_code: 'EMP-ACME-DEL',
        first_name: 'Ghost',
        last_name: 'Worker',
        email: 'ghost@acme.com',
        department: 'Operations',
        status: 'terminated',
        deleted_at: new Date().toISOString()
      });

      const res = await request(app)
        .get('/api/workforce')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      const hasGhost = res.body.data.some((m) => m.employee_code === 'EMP-ACME-DEL');
      assert.equal(hasGhost, false, 'Soft-deleted worker leaked into active workforce view!');
    }
  );

  await t.test('Super Admin Oversight: Can access any organization tenant', async () => {
    // Superadmin accessing Acme without being in memberships list
    const resAcme = await request(app)
      .get('/api/workforce')
      .set('Authorization', SUPERADMIN_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(resAcme.status, 200);
    assert.ok(Array.isArray(resAcme.body.data));

    // Superadmin accessing Apex
    const resApex = await request(app)
      .get('/api/workforce')
      .set('Authorization', SUPERADMIN_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID);

    assert.equal(resApex.status, 200);
    assert.ok(Array.isArray(resApex.body.data));
  });

  await t.test(
    'Manager Permitted Action: Manager can create workforce member in own tenant',
    async () => {
      const payload = {
        employee_code: 'EMP-ACME-MGR-ADD',
        first_name: 'Casey',
        last_name: 'Stoner',
        email: 'casey.s@acme.com',
        department: 'Fleet Operations',
        designation: 'Route Specialist',
        employment_type: 'contract'
      };

      const res = await request(app)
        .post('/api/workforce')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.employee_code, 'EMP-ACME-MGR-ADD');
    }
  );

  await t.test(
    'Employee Role Boundary: Employee can view workforce directory but CANNOT create members',
    async () => {
      // 1. Employee reading directory -> 200 OK
      const resRead = await request(app)
        .get('/api/workforce')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(resRead.status, 200);

      // 2. Employee attempting to create a member -> 403 Forbidden
      const resCreate = await request(app)
        .post('/api/workforce')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          employee_code: 'EMP-ACME-HACK',
          first_name: 'Hacker',
          last_name: 'Guy',
          email: 'hacker@acme.com'
        });

      assert.equal(resCreate.status, 403);
      assert.equal(resCreate.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
    }
  );

  await t.test(
    'Customer Account Isolation: Customer CANNOT access internal workforce directory',
    async () => {
      const res = await request(app)
        .get('/api/workforce')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
    }
  );

  await t.test(
    'Customer Cross-Tenant Boundary: Customer CANNOT access another organization',
    async () => {
      const res = await request(app)
        .get('/api/workforce')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  );
});
