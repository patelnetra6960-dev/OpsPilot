import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import express from 'express';
import { requirePermission, clearRevokedTokens } from '../middleware/authMiddleware.js';
import { PERMISSIONS, checkRolePermission } from '../config/permissions.js';

test('PROMPT 13 — Complete Authentication and Authorization Test Suite', async (t) => {
  const ACME_ORG_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_ORG_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Owner of Acme
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Manager at Acme
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Employee at Acme
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Customer at Acme (linked to cust-acme-1)
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Owner at Apex
  const SUPERADMIN_TOKEN = 'Bearer mock-token-superadmin'; // Platform Super Admin

  t.beforeEach(() => {
    clearRevokedTokens();
  });

  // ==========================================
  // SECTION 1: ACCESS TOKEN VERIFICATION
  // ==========================================
  await t.test('1. Access Token Verification & Cryptographic Handling', async (t2) => {
    await t2.test('1.1 Missing Authorization header returns 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    await t2.test('1.2 Malformed Authorization header returns 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Basic abc123xyz');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    await t2.test('1.3 Forged or unrecognized token returns 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer forged-malicious-token');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INVALID_TOKEN');
    });

    await t2.test('1.4 Expired token returns 401 TOKEN_EXPIRED', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer mock-token-expired-user');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'TOKEN_EXPIRED');
    });

    await t2.test('1.5 Verified token successfully retrieves user profile', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', ALEX_TOKEN);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, 'alex.director@acme.com');
      assert.equal(res.body.data.user.is_superadmin, false);
      assert.ok(Array.isArray(res.body.data.organizations));
    });
  });

  // ==========================================
  // SECTION 2: SECURE LOGOUT & SESSION HANDLING
  // ==========================================
  await t.test('2. Secure Logout & Session Revocation', async (t2) => {
    await t2.test(
      '2.1 Calling logout terminates session and adds token to revocation store',
      async () => {
        const ephemeralToken = 'Bearer mock-token-alex';

        // 1. Token works initially
        const preLogout = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', ephemeralToken);
        assert.equal(preLogout.status, 200);

        // 2. Perform logout
        const logoutRes = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', ephemeralToken);
        assert.equal(logoutRes.status, 200);
        assert.equal(logoutRes.body.success, true);

        // 3. Subsequent request with the same token is rejected
        const postLogout = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', ephemeralToken);
        assert.equal(postLogout.status, 401);
        assert.equal(postLogout.body.success, false);
        assert.equal(postLogout.body.error.code, 'TOKEN_REVOKED');
      }
    );
  });

  // ==========================================
  // SECTION 3: PRIVILEGE ESCALATION & IDOR PROTECTION
  // ==========================================
  await t.test('3. Protection Against Privilege Escalation & IDOR', async (t2) => {
    await t2.test('3.1 Non-superadmin cannot elevate themselves to is_superadmin', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Authorization', ALEX_TOKEN)
        .send({ is_superadmin: true, full_name: 'Alex Hacked' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FORBIDDEN_PRIVILEGE_ESCALATION');
    });

    await t2.test('3.2 Non-superadmin cannot alter their own organization role', async () => {
      // Alex (owner) tries to change their own role in Acme
      const res = await request(app)
        .patch('/api/v1/organizations/members/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ role: 'admin' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FORBIDDEN_SELF_ROLE_ELEVATION');
    });

    await t2.test('3.3 Non-owner admin/manager cannot promote members to owner', async () => {
      // Sarah (manager) attempts to promote David to owner
      const res = await request(app)
        .patch('/api/v1/organizations/members/dddddddd-dddd-dddd-dddd-dddddddddddd')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({ role: 'owner' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================
  // SECTION 4: MULTI-TENANT ISOLATION & MEMBERSHIP
  // ==========================================
  await t.test('4. Multi-Tenant Membership Verification & Boundary Enforcement', async (t2) => {
    await t2.test('4.1 Missing X-Tenant-Id returns 400 TENANT_HEADER_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current')
        .set('Authorization', ALEX_TOKEN);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'TENANT_HEADER_REQUIRED');
    });

    await t2.test('4.2 Non-existent organization returns 404 TENANT_NOT_FOUND', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', '99999999-9999-9999-9999-999999999999');

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'TENANT_NOT_FOUND');
    });

    await t2.test(
      '4.3 Cross-Tenant Breach Prevention: User Marcus from Apex cannot access Acme',
      async () => {
        const res = await request(app)
          .get('/api/v1/organizations/current')
          .set('Authorization', MARCUS_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
      }
    );

    await t2.test(
      '4.4 Legitimate member receives verified tenant and membership context',
      async () => {
        const res = await request(app)
          .get('/api/v1/organizations/current')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.organization.id, ACME_ORG_ID);
        assert.equal(res.body.data.membership.role, 'owner');
      }
    );
  });

  // ==========================================
  // SECTION 5: ROLE-BASED AUTHORIZATION (RBAC)
  // ==========================================
  await t.test('5. Role-Based Authorization Enforcement', async (t2) => {
    await t2.test('5.1 Manager can access workforce and operational stats', async () => {
      const res = await request(app)
        .get('/api/v1/workforce/stats')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    await t2.test(
      '5.2 Employee cannot create workforce members (403 INSUFFICIENT_ROLE_PERMISSIONS)',
      async () => {
        const res = await request(app)
          .post('/api/v1/workforce')
          .set('Authorization', DAVID_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID)
          .send({
            first_name: 'Unauthorized',
            last_name: 'Member',
            email: 'unauth@test.com',
            department: 'Ops',
            designation: 'Tech'
          });

        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
      }
    );

    await t2.test('5.3 Customer account cannot access internal workforce directory', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
    });
  });

  // ==========================================
  // SECTION 6: GRANULAR PERMISSION-BASED AUTHORIZATION
  // ==========================================
  await t.test('6. Granular Permission-Based Authorization Matrix', async (t2) => {
    await t2.test('6.1 checkRolePermission verifies canonical permission rules', () => {
      // Owner has all permissions
      assert.equal(checkRolePermission('owner', PERMISSIONS.WORKFORCE_DELETE), true);
      assert.equal(checkRolePermission('owner', PERMISSIONS.ORG_SETTINGS_UPDATE), true);

      // Manager has workforce & expense approve permissions, but cannot transfer org
      assert.equal(checkRolePermission('manager', PERMISSIONS.EXPENSES_APPROVE), true);
      assert.equal(checkRolePermission('manager', PERMISSIONS.WORKFORCE_CREATE), true);
      assert.equal(checkRolePermission('manager', PERMISSIONS.ORG_TRANSFER), false);

      // Employee has read and expense create, but cannot approve expenses
      assert.equal(checkRolePermission('employee', PERMISSIONS.EXPENSES_CREATE), true);
      assert.equal(checkRolePermission('employee', PERMISSIONS.EXPENSES_APPROVE), false);
      assert.equal(checkRolePermission('employee', PERMISSIONS.WORKFORCE_DELETE), false);

      // Customer has only service request own & invoice read own
      assert.equal(checkRolePermission('customer', PERMISSIONS.SERVICE_REQUESTS_CREATE), true);
      assert.equal(checkRolePermission('customer', PERMISSIONS.WORKFORCE_READ), false);
    });

    await t2.test('6.2 requirePermission middleware rejects unauthorized role', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, _res, next) => {
        req.user = { id: 'david-id', is_superadmin: false };
        req.membership = { role: 'employee', status: 'active' };
        next();
      });
      testApp.post(
        '/approve-expense',
        requirePermission(PERMISSIONS.EXPENSES_APPROVE),
        (_req, res) => {
          res.json({ ok: true });
        }
      );

      const res = await request(testApp).post('/approve-expense');
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'INSUFFICIENT_PERMISSIONS');
    });

    await t2.test('6.3 requirePermission middleware permits authorized manager', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, _res, next) => {
        req.user = { id: 'sarah-id', is_superadmin: false };
        req.membership = { role: 'manager', status: 'active' };
        next();
      });
      testApp.post(
        '/approve-expense',
        requirePermission(PERMISSIONS.EXPENSES_APPROVE),
        (_req, res) => {
          res.json({ ok: true });
        }
      );

      const res = await request(testApp).post('/approve-expense');
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
    });
  });

  // ==========================================
  // SECTION 7: SUPER ADMIN AUTHORIZATION
  // ==========================================
  await t.test('7. Super Admin Authorization & Global Oversight', async (t2) => {
    await t2.test('7.1 Non-superadmin is blocked from /api/v1/admin/overview', async () => {
      const res = await request(app).get('/api/v1/admin/overview').set('Authorization', ALEX_TOKEN);
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
    });

    await t2.test('7.2 Verified Super Admin gains access to /api/v1/admin/overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', SUPERADMIN_TOKEN);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.superAdminAccess, 'granted');
      assert.ok(res.body.data.metrics.totalOrganizations >= 2);
    });

    await t2.test('7.3 Super Admin can access any tenant without cross-tenant block', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', SUPERADMIN_TOKEN)
        .set('X-Tenant-Id', APEX_ORG_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  // ==========================================
  // SECTION 8: CUSTOMER AUTHORIZATION & IDOR GUARDS
  // ==========================================
  await t.test('8. Customer Authorization & Anti-IDOR Protection', async (t2) => {
    await t2.test('8.1 Customer can access customer portal overview in own tenant', async () => {
      const res = await request(app)
        .get('/api/v1/customer/portal')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.customer.email, 'rachel.green@metrohealth.com');
      assert.ok(Array.isArray(res.body.data.serviceRequests));
    });

    await t2.test('8.2 Non-customer employee cannot access customer portal routes', async () => {
      const res = await request(app)
        .get('/api/v1/customer/portal')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_CUSTOMER_ROLE_REQUIRED');
    });

    await t2.test('8.3 Customer can view their own service request detail', async () => {
      const res = await request(app)
        .get('/api/v1/customer/service-requests/sr-1')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, 'sr-1');
    });

    await t2.test(
      '8.4 IDOR Guard: Customer cannot view service request belonging to another customer',
      async () => {
        // In mockDatabase, sr-3 belongs to customer cust-acme-2 in Acme org.
        // Rachel (cust-acme-1) attempts to access sr-3 in Acme: IDOR guard blocks it
        const res = await request(app)
          .get('/api/v1/customer/service-requests/sr-3')
          .set('Authorization', RACHEL_TOKEN)
          .set('X-Tenant-Id', ACME_ORG_ID);

        assert.equal(res.status, 403);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'FORBIDDEN_RESOURCE_ACCESS');
      }
    );
  });
});
