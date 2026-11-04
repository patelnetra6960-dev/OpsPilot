import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { clearRevokedTokens } from '../middleware/authMiddleware.js';

test('PROMPT 14 — Organization, Membership & Employee Management APIs', async (t) => {
  const ACME_ORG_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_ORG_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Owner of Acme
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Manager at Acme
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Employee at Acme
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Customer at Acme
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Owner at Apex

  t.beforeEach(() => {
    clearRevokedTokens();
  });

  // ==========================================
  // 1. ORGANIZATION MANAGEMENT APIS
  // ==========================================
  await t.test('1. Organization Management APIs', async (t2) => {
    await t2.test(
      '1.1 Create Organization: Provisions organization with creator as owner (201 Created)',
      async () => {
        const payload = {
          name: 'Horizon Logistics Inc',
          subscription_tier: 'growth',
          settings: { timezone: 'America/Chicago', currency: 'USD' }
        };

        const res = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', ALEX_TOKEN)
          .send(payload);

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.name, 'Horizon Logistics Inc');
        assert.equal(res.body.data.role, 'owner');
      }
    );

    await t2.test(
      '1.2 Create Organization Validation: Rejects missing or short name with 400 Bad Request',
      async () => {
        const res = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', ALEX_TOKEN)
          .send({ name: 'A' }); // Name must be at least 2 chars

        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      }
    );

    await t2.test(
      '1.3 View Current Organization Details: Returns settings and active stats',
      async () => {
        const res = await request(app)
          .get('/api/v1/organizations/current')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.organization.id, ACME_ORG_ID);
        assert.ok(res.body.data.organization.settings);
        assert.ok(res.body.data.organization.stats);
        assert.ok(res.body.data.organization.stats.activeMembers >= 1);
      }
    );

    await t2.test('1.4 Update Organization: Owner can update name and slug', async () => {
      const res = await request(app)
        .patch('/api/v1/organizations/current')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ name: 'Acme Logistics Global Enterprise' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Acme Logistics Global Enterprise');
    });

    await t2.test(
      '1.5 Update Organization Unauthorized: Employee cannot update organization (403 Forbidden)',
      async () => {
        const res = await request(app)
          .patch('/api/v1/organizations/current')
          .set('Authorization', DAVID_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({ name: 'Hacked Org Name' });

        assert.equal(res.status, 403);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
      }
    );

    await t2.test('1.6 Organization Settings: Get and update settings JSONB', async () => {
      // 1. Get settings
      const getRes = await request(app)
        .get('/api/v1/organizations/current/settings')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(getRes.status, 200);
      assert.ok(getRes.body.data);

      // 2. Update settings
      const patchRes = await request(app)
        .patch('/api/v1/organizations/current/settings')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({
          timezone: 'America/New_York',
          currency: 'USD',
          theme: 'dark'
        });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.success, true);
      assert.equal(patchRes.body.data.theme, 'dark');
    });
  });

  // ==========================================
  // 2. MEMBERSHIP & INVITATION APIS
  // ==========================================
  await t.test('2. Membership & Invitation APIs', async (t2) => {
    let testInvitationToken = null;
    let testInvitationId = null;

    await t2.test(
      '2.1 Create Invitation: Owner creates membership invitation with secure token',
      async () => {
        const res = await request(app)
          .post('/api/v1/organizations/invitations')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({
            email: 'new.engineer@acme.com',
            role: 'employee',
            department_id: 'dept-acme-1'
          });

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.email, 'new.engineer@acme.com');
        assert.equal(res.body.data.role, 'employee');
        assert.equal(res.body.data.status, 'pending');
        assert.ok(res.body.data.token);
        assert.ok(res.body.data.expires_at);

        testInvitationToken = res.body.data.token;
        testInvitationId = res.body.data.id;
        assert.ok(testInvitationId);
      }
    );

    await t2.test('2.2 List Invitations: Returns paginated organization invitations', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/invitations?page=1&limit=10')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.meta.pagination);
      assert.ok(res.body.meta.pagination.total >= 1);
    });

    await t2.test(
      '2.3 Accept Invitation: Multi-step transaction creates membership and employee profile',
      async () => {
        const res = await request(app)
          .post(`/api/v1/organizations/invitations/${testInvitationToken}/accept`)
          .set('Authorization', DAVID_TOKEN) // Accepting user
          .send({ full_name: 'Jordan Sparks' });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.membership.status, 'active');
        assert.equal(res.body.data.membership.role, 'employee');
        assert.ok(res.body.data.workforceMember);
      }
    );

    await t2.test(
      '2.4 Accept Invalid Invitation: Rejects already accepted or forged token with 404',
      async () => {
        const res = await request(app)
          .post(`/api/v1/organizations/invitations/${testInvitationToken}/accept`)
          .set('Authorization', DAVID_TOKEN)
          .send();

        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'INVALID_INVITATION_TOKEN');
      }
    );

    await t2.test('2.5 Revoke Invitation: Owner can revoke a pending invitation', async () => {
      // 1. Create temporary invitation
      const createRes = await request(app)
        .post('/api/v1/organizations/invitations')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ email: 'to.revoke@acme.com', role: 'employee' });

      assert.equal(createRes.status, 201);
      const toRevokeId = createRes.body.data.id;

      // 2. Revoke it
      const revokeRes = await request(app)
        .delete(`/api/v1/organizations/invitations/${toRevokeId}`)
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(revokeRes.status, 200);
      assert.equal(revokeRes.body.data.status, 'revoked');
    });

    await t2.test(
      '2.6 Deactivate and Re-activate Membership: Admin can suspend and restore member',
      async () => {
        // Member m2 is Sarah Chen
        const suspendRes = await request(app)
          .patch('/api/v1/organizations/members/m2/status')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({ status: 'suspended' });

        assert.equal(suspendRes.status, 200);
        assert.equal(suspendRes.body.data.status, 'suspended');

        // Re-activate
        const activateRes = await request(app)
          .patch('/api/v1/organizations/members/m2/status')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({ status: 'active' });

        assert.equal(activateRes.status, 200);
        assert.equal(activateRes.body.data.status, 'active');
      }
    );

    await t2.test('2.7 Owner Protection: Cannot deactivate an organization owner', async () => {
      // Member m1 is Alex Rivera (owner)
      const res = await request(app)
        .patch('/api/v1/organizations/members/m1/status')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ status: 'suspended' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FORBIDDEN_CANNOT_DEACTIVATE_OWNER');
    });
  });

  // ==========================================
  // 3. EMPLOYEE & WORKFORCE MANAGEMENT APIS
  // ==========================================
  await t.test('3. Employee & Workforce Management APIs', async (t2) => {
    let createdEmployeeId = null;

    await t2.test(
      '3.1 Create Employee Profile: Manager creates full employee record (201 Created)',
      async () => {
        const payload = {
          employee_code: `EMP-TEST-${Date.now().toString().slice(-4)}`,
          first_name: 'Gabriel',
          last_name: 'Vance',
          email: `gabriel.${Date.now()}@acme.com`,
          phone: '+1 (555) 321-9988',
          department_id: 'dept-acme-1',
          department: 'Fleet Operations',
          designation: 'Senior Fleet Specialist',
          employment_type: 'full_time',
          hourly_rate: 48.5,
          skills: ['Fleet Dispatch', 'Telematics', 'GPS Tracking']
        };

        const res = await request(app)
          .post('/api/v1/workforce')
          .set('Authorization', SARAH_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send(payload);

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.first_name, 'Gabriel');
        assert.equal(res.body.data.department, 'Fleet Operations');
        assert.equal(res.body.data.hourly_rate, 48.5);

        createdEmployeeId = res.body.data.id;
      }
    );

    await t2.test(
      '3.2 Create Employee Conflict: Duplicate employee code returns 409 Conflict',
      async () => {
        const duplicatePayload = {
          employee_code: 'EMP-ACME-001', // Pre-existing code in Acme
          first_name: 'Clone',
          last_name: 'User',
          email: 'clone.unique@acme.com'
        };

        const res = await request(app)
          .post('/api/v1/workforce')
          .set('Authorization', SARAH_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send(duplicatePayload);

        assert.equal(res.status, 409);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'CONFLICT_EMPLOYEE_CODE');
      }
    );

    await t2.test(
      '3.3 List Employees with Pagination: Verifies pagination limits and meta',
      async () => {
        const res = await request(app)
          .get('/api/v1/workforce?page=1&limit=2')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
        assert.equal(res.body.data.length, 2);
        assert.equal(res.body.meta.pagination.page, 1);
        assert.equal(res.body.meta.pagination.limit, 2);
        assert.ok(res.body.meta.pagination.total >= 3);
      }
    );

    await t2.test(
      '3.4 Search Employees: Query across names, email, and employee code',
      async () => {
        const res = await request(app)
          .get('/api/v1/workforce?search=Miller')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.data.length >= 1);
        assert.ok(res.body.data.some((e) => e.last_name === 'Miller'));
      }
    );

    await t2.test('3.5 Filter Employees: Filters by department and status', async () => {
      const res = await request(app)
        .get('/api/v1/workforce?department=Warehouse+Logistics&status=active')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(
        res.body.data.every((e) => e.department === 'Warehouse Logistics' && e.status === 'active')
      );
    });

    await t2.test(
      '3.6 View Employee Details: Returns full profile and relational links',
      async () => {
        const res = await request(app)
          .get('/api/v1/workforce/w1')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.id, 'w1');
        assert.equal(res.body.data.first_name, 'David');
        assert.ok(res.body.data.departmentDetails);
      }
    );

    await t2.test('3.7 Update Employee Details: Modifies designation and hourly rate', async () => {
      const res = await request(app)
        .patch(`/api/v1/workforce/${createdEmployeeId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({
          designation: 'Principal Logistics Architect',
          hourly_rate: 55.0
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.designation, 'Principal Logistics Architect');
      assert.equal(res.body.data.hourly_rate, 55.0);
    });

    await t2.test('3.8 Assign Department: Organization-scoped department assignment', async () => {
      const res = await request(app)
        .patch(`/api/v1/workforce/${createdEmployeeId}/department`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ department_id: 'dept-acme-2' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.department_id, 'dept-acme-2');
      assert.equal(res.body.data.department, 'Warehouse Logistics');
    });

    await t2.test(
      '3.9 Assign Manager: Assigns supervisor and prevents self-manager cycle',
      async () => {
        // 1. Assign w1 (David Miller) as manager
        const assignRes = await request(app)
          .patch(`/api/v1/workforce/${createdEmployeeId}/manager`)
          .set('Authorization', SARAH_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({ manager_id: 'w1' });

        assert.equal(assignRes.status, 200);
        assert.equal(assignRes.body.data.manager_id, 'w1');

        // 2. Prevent self-management cycle (assigning employee as their own manager)
        const cycleRes = await request(app)
          .patch(`/api/v1/workforce/${createdEmployeeId}/manager`)
          .set('Authorization', SARAH_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({ manager_id: createdEmployeeId });

        assert.equal(cycleRes.status, 400);
        assert.equal(cycleRes.body.success, false);
        assert.equal(cycleRes.body.error.code, 'INVALID_MANAGER_CYCLE');
      }
    );

    await t2.test('3.10 Change Permitted Role: Admin updates member permitted role', async () => {
      // w1 has user_id 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      const res = await request(app)
        .patch('/api/v1/workforce/w1/role')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ role: 'manager' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.newRole, 'manager');
    });

    await t2.test(
      '3.11 Deactivate Employee: Multi-step transaction terminates member and suspends access',
      async () => {
        const res = await request(app)
          .delete(`/api/v1/workforce/${createdEmployeeId}`)
          .set('Authorization', SARAH_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.status, 'terminated');
        assert.ok(res.body.data.deactivatedAt);

        // Verify employee is excluded from standard active directory
        const listRes = await request(app)
          .get('/api/v1/workforce')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(listRes.status, 200);
        assert.ok(!listRes.body.data.some((e) => e.id === createdEmployeeId));
      }
    );

    await t2.test(
      '3.12 Cross-Tenant Isolation: User Marcus from Apex cannot view Acme employees',
      async () => {
        const res = await request(app)
          .get('/api/v1/workforce/w1')
          .set('Authorization', MARCUS_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');

        // User Marcus CAN view Apex workforce within their authorized tenant
        const apexRes = await request(app)
          .get('/api/v1/workforce')
          .set('Authorization', MARCUS_TOKEN)
          .set('X-Tenant-Id', APEX_ORG_ID);

        assert.equal(apexRes.status, 200);
        assert.equal(apexRes.body.success, true);
      }
    );

    await t2.test(
      '3.13 Customer Account Boundary: Customer account cannot access employee management',
      async () => {
        const res = await request(app)
          .get('/api/v1/workforce')
          .set('Authorization', RACHEL_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
      }
    );
  });
});
