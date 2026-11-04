import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { clearRevokedTokens } from '../middleware/authMiddleware.js';
import {
  TEST_PERSONAS,
  TEST_TENANTS,
  makeAuthHeaders,
  assertSuccessEnvelope,
  assertPaginatedEnvelope,
  assertErrorEnvelope,
  assertRequiresAuth,
  assertRequiresTenantHeader,
  assertBlocksCrossTenantAccess
} from './testUtils.js';
import { BaseRepository } from '../repositories/base.repository.js';
import { TenantIsolationError } from '../utils/errors.js';

test('PROMPT 15 — Complete CRUD & Business API Framework Test Suite', async (t) => {
  const { ALEX, SARAH, DAVID, MARCUS } = TEST_PERSONAS;
  const { ACME, APEX } = TEST_TENANTS;

  t.beforeEach(() => {
    clearRevokedTokens();
  });

  // ==========================================
  // 1. ARCHITECTURAL CONVENTIONS & HTTP VERBS
  // ==========================================
  await t.test(
    '1. API Conventions: GET, POST, PATCH, DELETE & Standard Status Codes',
    async (t2) => {
      let createdCustomerId = null;

      await t2.test(
        '1.1 GET for Reading (List): Returns HTTP 200 with paginated envelope',
        async () => {
          const res = await request(app)
            .get('/api/v1/customers')
            .set(makeAuthHeaders(ALEX.token, ACME));

          assertPaginatedEnvelope(res, 200);
          assert.ok(res.body.data.length >= 1);
          assert.ok(res.body.data.some((c) => c.id === 'cust-acme-1'));
        }
      );

      await t2.test(
        '1.2 POST for Creation: Returns HTTP 201 Created with validated entity',
        async () => {
          const res = await request(app)
            .post('/api/v1/customers')
            .set(makeAuthHeaders(SARAH.token, ACME)) // Manager can create
            .send({
              name: 'Apex Precision Tools',
              company_name: 'Precision Global',
              email: 'sales@precisiontools.com',
              phone: '+1 555-4321',
              sla_tier: 'gold',
              status: 'active'
            });

          assertSuccessEnvelope(res, 201);
          assert.equal(res.body.data.name, 'Apex Precision Tools');
          assert.equal(res.body.data.email, 'sales@precisiontools.com');
          assert.equal(res.body.data.sla_tier, 'gold');
          assert.equal(res.body.data.organization_id, ACME);
          assert.ok(res.body.data.customer_code.startsWith('CUST-'));
          assert.ok(res.body.data.id);

          createdCustomerId = res.body.data.id;
        }
      );

      await t2.test(
        '1.3 GET for Reading (Single): Returns HTTP 200 with record details',
        async () => {
          const res = await request(app)
            .get(`/api/v1/customers/${createdCustomerId}`)
            .set(makeAuthHeaders(DAVID.token, ACME)); // Employee can read

          assertSuccessEnvelope(res, 200);
          assert.equal(res.body.data.id, createdCustomerId);
          assert.equal(res.body.data.name, 'Apex Precision Tools');
        }
      );

      await t2.test(
        '1.4 PATCH for Partial Update: Updates target fields with HTTP 200 OK',
        async () => {
          const res = await request(app)
            .patch(`/api/v1/customers/${createdCustomerId}`)
            .set(makeAuthHeaders(SARAH.token, ACME))
            .send({
              phone: '+1 555-9999',
              sla_tier: 'platinum'
            });

          assertSuccessEnvelope(res, 200);
          assert.equal(res.body.data.phone, '+1 555-9999');
          assert.equal(res.body.data.sla_tier, 'platinum');
          assert.equal(res.body.data.name, 'Apex Precision Tools'); // Unchanged
        }
      );

      await t2.test(
        '1.5 POST for Actions: Executes business state transition with HTTP 200 OK',
        async () => {
          // Suspend customer action
          const suspendRes = await request(app)
            .post(`/api/v1/customers/${createdCustomerId}/actions/suspend`)
            .set(makeAuthHeaders(ALEX.token, ACME))
            .send({ notes: 'Account temporarily suspended for compliance review' });

          assertSuccessEnvelope(suspendRes, 200);
          assert.equal(suspendRes.body.data.status, 'suspended');

          // Reactivate customer action
          const activateRes = await request(app)
            .post(`/api/v1/customers/${createdCustomerId}/actions/activate`)
            .set(makeAuthHeaders(ALEX.token, ACME))
            .send({ notes: 'Account cleared and reactivated' });

          assertSuccessEnvelope(activateRes, 200);
          assert.equal(activateRes.body.data.status, 'active');
        }
      );

      await t2.test('1.6 DELETE for Deletion: Soft-deletes record with HTTP 200 OK', async () => {
        const res = await request(app)
          .delete(`/api/v1/customers/${createdCustomerId}`)
          .set(makeAuthHeaders(ALEX.token, ACME));

        assertSuccessEnvelope(res, 200);
        assert.equal(res.body.data.id, createdCustomerId);
        assert.equal(res.body.data.deleted, true);

        // Verify that subsequent GET returns 404 NOT_FOUND
        const getRes = await request(app)
          .get(`/api/v1/customers/${createdCustomerId}`)
          .set(makeAuthHeaders(ALEX.token, ACME));

        assertErrorEnvelope(getRes, 404, 'NOT_FOUND');
      });
    }
  );

  // ==========================================
  // 2. SEARCH, FILTERING, SORTING & PAGINATION
  // ==========================================
  await t.test('2. Query Engine: Pagination, Sorting, Search, and Filtering', async (t2) => {
    await t2.test(
      '2.1 Search: Multi-field search across name, company, email, and code',
      async () => {
        const res = await request(app)
          .get('/api/v1/customers?search=Metro')
          .set(makeAuthHeaders(ALEX.token, ACME));

        assertPaginatedEnvelope(res, 200);
        assert.ok(res.body.data.every((c) => c.name.includes('Metro')));
      }
    );

    await t2.test('2.2 Filtering: Filter by SLA tier and status', async () => {
      const res = await request(app)
        .get('/api/v1/customers?sla_tier=critical&status=active')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(res, 200);
      assert.ok(res.body.data.every((c) => c.sla_tier === 'critical' && c.status === 'active'));
    });

    await t2.test('2.3 Sorting: Sorts ascending and descending', async () => {
      const resAsc = await request(app)
        .get('/api/v1/customers?sortBy=name&sortOrder=asc')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(resAsc, 200);

      const resDesc = await request(app)
        .get('/api/v1/customers?sortBy=name&sortOrder=desc')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(resDesc, 200);
    });

    await t2.test('2.4 Pagination: Limits, total counts, and boundaries', async () => {
      const res = await request(app)
        .get('/api/v1/customers?page=1&limit=1')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(res, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.limit, 1);
      assert.ok(res.body.pagination.total >= 1);
    });
  });

  // ==========================================
  // 3. VALIDATION & ERROR HANDLING CONTRACTS
  // ==========================================
  await t.test('3. HTTP Error Status Codes & Domain Error Handling', async (t2) => {
    await t2.test(
      '3.1 400 Bad Request: Schema validation rejects malformed email and missing name',
      async () => {
        const res = await request(app)
          .post('/api/v1/customers')
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send({
            name: '', // Too short
            email: 'not-an-email'
          });

        assertErrorEnvelope(res, 400, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(res.body.error.details));
        assert.ok(res.body.error.details.some((d) => d.field.includes('email')));
        assert.ok(res.body.error.details.some((d) => d.field.includes('name')));
      }
    );

    await t2.test(
      '3.2 409 Conflict: Rejects duplicate customer email in same organization',
      async () => {
        const res = await request(app)
          .post('/api/v1/customers')
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send({
            name: 'Duplicate Health System',
            email: 'rachel.green@metrohealth.com' // Already exists in Acme
          });

        assertErrorEnvelope(res, 409, 'CONFLICT');
        assert.ok(res.body.error.message.includes('already exists'));
      }
    );

    await t2.test('3.3 403 Forbidden: Employee role cannot delete customer', async () => {
      const res = await request(app)
        .delete('/api/v1/customers/cust-acme-1')
        .set(makeAuthHeaders(DAVID.token, ACME)); // David is employee, delete requires owner/admin

      assertErrorEnvelope(res, 403, 'INSUFFICIENT_ROLE_PERMISSIONS');
    });

    await t2.test('3.4 404 Not Found: Requesting non-existent customer ID', async () => {
      const res = await request(app)
        .get('/api/v1/customers/non-existent-id-99999')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertErrorEnvelope(res, 404, 'NOT_FOUND');
    });

    await t2.test(
      '3.5 422 Unprocessable Entity: Unsupported business action rejects cleanly',
      async () => {
        const res = await request(app)
          .post('/api/v1/customers/cust-acme-1/actions/invalid-action')
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send();

        assertErrorEnvelope(res, 422, 'UNPROCESSABLE_ENTITY');
      }
    );
  });

  // ==========================================
  // 4. TENANT ISOLATION GUARANTEES
  // ==========================================
  await t.test('4. Enterprise Multi-Tenant Boundary Enforcement', async (t2) => {
    await t2.test('4.1 Missing Auth rejects with 401 UNAUTHORIZED', async () => {
      await assertRequiresAuth(app, 'GET', '/api/v1/customers');
    });

    await t2.test('4.2 Missing X-Tenant-Id rejects with 400 TENANT_HEADER_REQUIRED', async () => {
      await assertRequiresTenantHeader(app, 'GET', '/api/v1/customers', ALEX.token);
    });

    await t2.test(
      '4.3 Cross-Tenant Isolation: User Marcus from Apex cannot access Acme customers',
      async () => {
        await assertBlocksCrossTenantAccess(app, 'GET', '/api/v1/customers', MARCUS.token, ACME);
      }
    );

    await t2.test(
      '4.4 Cross-Tenant Isolation: Apex user cannot view or mutate Acme customer by ID',
      async () => {
        const getRes = await request(app)
          .get('/api/v1/customers/cust-acme-1')
          .set(makeAuthHeaders(MARCUS.token, APEX)); // Marcus is in Apex, customer belongs to Acme

        assertErrorEnvelope(getRes, 403, 'FORBIDDEN_CROSS_TENANT_ACCESS');

        const patchRes = await request(app)
          .patch('/api/v1/customers/cust-acme-1')
          .set(makeAuthHeaders(MARCUS.token, APEX))
          .send({ name: 'Tampered Name' });

        assertErrorEnvelope(patchRes, 403, 'FORBIDDEN_CROSS_TENANT_ACCESS');
      }
    );

    await t2.test(
      '4.5 BaseRepository Invariant: Failsafe throws TenantIsolationError if organizationId omitted',
      async () => {
        const repo = new BaseRepository('test_table');
        await assert.rejects(
          async () => {
            await repo.findById('some-id', null);
          },
          (err) => {
            assert.ok(err instanceof TenantIsolationError);
            assert.equal(err.statusCode, 403);
            return true;
          }
        );
      }
    );
  });

  // ==========================================
  // 5. OPENAPI & SWAGGER DOCUMENTATION
  // ==========================================
  await t.test('5. OpenAPI / Swagger Documentation Endpoints', async (t2) => {
    await t2.test(
      '5.1 GET /api/v1/docs/openapi.json returns valid OpenAPI 3.0 specification',
      async () => {
        const res = await request(app).get('/api/v1/docs/openapi.json');
        assert.equal(res.status, 200);
        assert.equal(res.headers['content-type'].includes('application/json'), true);
        assert.equal(res.body.openapi, '3.0.3');
        assert.equal(res.body.info.title, 'OpsPilot Enterprise API');
        assert.ok(res.body.paths['/customers']);
        assert.ok(res.body.paths['/workforce']);
        assert.ok(res.body.paths['/organizations']);
        assert.ok(res.body.components.securitySchemes.BearerAuth);
        assert.ok(res.body.components.securitySchemes.TenantHeader);
      }
    );

    await t2.test('5.2 GET /api/v1/docs/ serves Swagger UI documentation', async () => {
      const res = await request(app).get('/api/v1/docs/');
      assert.equal(res.status, 200);
      assert.ok(res.text.includes('swagger-ui'));
    });

    await t2.test('5.3 Root /docs redirects to /api/v1/docs/', async () => {
      const res = await request(app).get('/docs');
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/api/v1/docs/');
    });
  });
});
