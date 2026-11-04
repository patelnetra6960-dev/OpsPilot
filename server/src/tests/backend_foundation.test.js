import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { BaseRepository } from '../repositories/base.repository.js';
import { createRateLimiter } from '../middleware/rateLimitMiddleware.js';
import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { globalErrorHandler } from '../middleware/errorMiddleware.js';

test('Prompt 12 — Express Backend Foundation Test Suite', async (t) => {
  await t.test('1. API Versioning: GET /api/v1/health returns operational status', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.message, 'string');
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.service, 'opspilot-server');
    assert.equal(res.body.data.features.multiTenancy, 'active');
    assert.equal(res.body.data.features.databaseRLS, 'enforced');
    assert.equal(res.body.data.features.rowLevelSecurity, 'enforced');
    assert.ok(res.body.data.uptimeSeconds >= 0);
    assert.ok(res.body.data.services.database);
    assert.ok(res.body.data.services.storage);
    assert.ok(res.body.data.system.nodeVersion);

    // Standard meta envelope
    assert.ok(res.body.meta);
    assert.ok(res.body.meta.timestamp);
    assert.ok(res.body.meta.requestId);
    assert.ok(res.headers['x-request-id']);
    assert.equal(res.body.meta.requestId, res.headers['x-request-id']);
  });

  await t.test(
    '2. Backward Compatibility: GET /api/health alias functions identically',
    async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'healthy');
    }
  );

  await t.test('3. Helmet Security Headers are present on responses', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.ok(res.headers['x-dns-prefetch-control']);
    assert.ok(res.headers['x-content-type-options']);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  await t.test('4. CORS and exposed tracing headers are configured', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  await t.test(
    '5. Centralized 404 Handler returns standard error format for unknown routes',
    async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'NOT_FOUND');
      assert.ok(res.body.error.message.includes('Route not found'));
      assert.ok(res.body.meta.requestId);
    }
  );

  await t.test(
    '6. Request Validation Middleware rejects malformed auth input (400 Bad Request)',
    async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email-address', password: '' }); // Invalid email and missing password

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.error.details));
      assert.ok(res.body.error.details.length >= 2);
    }
  );

  await t.test(
    '7. Rate Limiter: In-memory sliding window enforces rate limit with standard headers',
    async () => {
      const testApp = express();
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        keyGenerator: () => 'test-client-key'
      });

      testApp.use((req, _res, next) => {
        // Force rate limiting evaluation
        req.headers['x-test-rate-limit'] = 'true';
        next();
      });
      testApp.use(limiter);
      testApp.get('/test-limit', (_req, res) => res.json({ ok: true }));

      // Request 1: Allowed
      const res1 = await request(testApp).get('/test-limit');
      assert.equal(res1.status, 200);
      assert.equal(res1.headers['ratelimit-limit'], '2');
      assert.equal(res1.headers['ratelimit-remaining'], '1');

      // Request 2: Allowed
      const res2 = await request(testApp).get('/test-limit');
      assert.equal(res2.status, 200);
      assert.equal(res2.headers['ratelimit-remaining'], '0');

      // Request 3: Rate Limited (429)
      const res3 = await request(testApp).get('/test-limit');
      assert.equal(res3.status, 429);
      assert.equal(res3.body.success, false);
      assert.equal(res3.body.error.code, 'TOO_MANY_REQUESTS');
      assert.ok(res3.headers['retry-after']);
    }
  );

  await t.test(
    '8. Async Error Handling Mechanism captures async errors without crashing',
    async () => {
      const testApp = express();
      testApp.get(
        '/throw-async',
        asyncHandler(async () => {
          throw new Error('Async test failure trapped');
        })
      );
      testApp.use(globalErrorHandler);

      const res = await request(testApp).get('/throw-async');
      assert.equal(res.status, 500);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INTERNAL_SERVER_ERROR');
      assert.equal(res.body.error.message, 'Async test failure trapped');
    }
  );

  await t.test('9. BaseRepository supports tenant queries and mock fallback', async () => {
    const repo = new BaseRepository('organizations');
    assert.equal(repo.tableName, 'organizations');

    // In mock mode without live Supabase connection, it queries mock data store
    const result = await repo.findMany('11111111-1111-1111-1111-111111111111');
    assert.ok(result);
    assert.ok(Array.isArray(result.data));
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].id, '11111111-1111-1111-1111-111111111111');
    assert.equal(result.pagination.total, 1);

    // Verify finding by ID
    const org = await repo.findById(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111'
    );
    assert.ok(org);
    assert.equal(org.name, 'Acme Logistics Global');
  });
});
