import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';
import { mockDatabase } from '../../server/src/config/supabase.js';
import { aiRateLimiter } from '../../server/src/middleware/aiRateLimitMiddleware.js';

test('Integration Test: Optional AI-Powered Business Assistant', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner
  const SUPERADMIN_TOKEN = 'Bearer mock-token-superadmin'; // Platform Super Admin

  // Clean rate limit map before test run
  aiRateLimiter.clear();

  // =========================================================================
  // 1. Suggested Prompts Endpoint
  // =========================================================================

  await t.test('1.1 GET /api/v1/ai/suggestions returns curated business questions', async () => {
    const res = await request(app)
      .get('/api/v1/ai/suggestions')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Data should be an array of suggestions');
    assert.ok(res.body.data.length >= 5, 'Should have at least 5 default prompts');

    const prompts = res.body.data.map((s) => s.prompt);
    assert.ok(prompts.some((p) => p.includes('overdue')), 'Should include overdue projects query');
    assert.ok(prompts.some((p) => p.includes('completed this month')), 'Should include tasks completed query');
    assert.ok(prompts.some((p) => p.includes('minimum stock')), 'Should include low stock query');
    assert.ok(prompts.some((p) => p.includes('pending service requests')), 'Should include pending requests query');
    assert.ok(prompts.some((p) => p.includes('performance')), 'Should include performance summary query');
  });

  // =========================================================================
  // 2. Natural-Language Business Queries (The 5 Core Prompts)
  // =========================================================================

  await t.test('2.1 Prompt 1: "Which projects are overdue?"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which projects are overdue?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.intent, 'OVERDUE_PROJECTS');
    assert.ok(typeof res.body.data.answer === 'string' && res.body.data.answer.length > 0);
    assert.ok(res.body.data.data !== undefined, 'Structured data must be attached');
    assert.ok(typeof res.body.data.data.total_overdue === 'number');
    assert.ok(Array.isArray(res.body.data.data.overdue_projects));
    assert.ok(Array.isArray(res.body.data.suggested_actions));
    assert.ok(res.body.data.duration_ms >= 0);
    assert.ok(res.body.data.provider, 'Must indicate provider (e.g. opspilot-built-in)');
  });

  await t.test('2.2 Prompt 2: "How many tasks were completed this month?"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'How many tasks were completed this month?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.intent, 'COMPLETED_TASKS');
    assert.ok(typeof res.body.data.data.total_completed_this_month === 'number');
    assert.ok(res.body.data.data.priority_breakdown !== undefined);
    assert.ok(res.body.data.answer.toLowerCase().includes('completed'));
  });

  await t.test('2.3 Prompt 3: "Which inventory items are below minimum stock?"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which inventory items are below minimum stock?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.intent, 'LOW_STOCK_INVENTORY');
    assert.ok(typeof res.body.data.data.total_critical_items === 'number');
    assert.ok(Array.isArray(res.body.data.data.low_stock_items));
    assert.ok(res.body.data.answer.toLowerCase().includes('stock') || res.body.data.answer.toLowerCase().includes('inventory'));
  });

  await t.test('2.4 Prompt 4: "What are the pending service requests?"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'What are the pending service requests?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.intent, 'PENDING_SERVICE_REQUESTS');
    assert.ok(typeof res.body.data.data.total_pending === 'number');
    assert.ok(Array.isArray(res.body.data.data.pending_requests));
    assert.ok(res.body.data.answer.toLowerCase().includes('service') || res.body.data.answer.toLowerCase().includes('request'));
  });

  await t.test('2.5 Prompt 5: "Summarize this month\'s business performance"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: "Summarize this month's business performance" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.intent, 'PERFORMANCE_SUMMARY');
    assert.ok(res.body.data.data.kpis !== undefined);
    assert.ok(typeof res.body.data.data.kpis.tasks_completed_this_month === 'number');
    assert.ok(typeof res.body.data.data.kpis.active_projects === 'number');
    assert.ok(typeof res.body.data.data.kpis.invoiced_amount === 'number');
    assert.ok(typeof res.body.data.data.kpis.approved_expenses === 'number');
    assert.ok(res.body.data.answer.toLowerCase().includes('performance') || res.body.data.answer.toLowerCase().includes('summary'));
  });

  // =========================================================================
  // 3. Strict Multi-Tenant Isolation
  // =========================================================================

  await t.test('3.1 Tenant isolation: Acme manager never receives Apex data', async () => {
    // Inject a special overdue project strictly in Apex Global
    const apexSpecialProjectId = 'apex-proj-overdue-isolated-999';
    mockDatabase.projects = mockDatabase.projects || [];
    mockDatabase.projects.push({
      id: apexSpecialProjectId,
      organization_id: APEX_TENANT_ID,
      name: 'Apex Classified Confidential Initiative',
      status: 'in_progress',
      target_end_date: '2023-01-01T00:00:00Z', // Far in the past
      budget: 500000,
      client: 'Apex Secret Client'
    });

    // Query as Acme Manager (Sarah)
    const acmeRes = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which projects are overdue?' });

    assert.equal(acmeRes.status, 200);
    const acmeProjectNames = acmeRes.body.data.data.overdue_projects.map((p) => p.name);
    assert.ok(
      !acmeProjectNames.includes('Apex Classified Confidential Initiative'),
      'CRITICAL SECURITY FAILURE: Acme manager saw an Apex project!'
    );
    assert.ok(
      !acmeRes.body.data.answer.includes('Apex Classified Confidential Initiative'),
      'CRITICAL SECURITY FAILURE: AI natural language leaked Apex project name!'
    );

    // Query as Apex Manager (Marcus)
    const apexRes = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({ query: 'Which projects are overdue?' });

    assert.equal(apexRes.status, 200);
    const apexProjectNames = apexRes.body.data.data.overdue_projects.map((p) => p.name);
    assert.ok(
      apexProjectNames.includes('Apex Classified Confidential Initiative'),
      'Apex manager should see their own overdue project'
    );

    // Clean up injected test project
    mockDatabase.projects = mockDatabase.projects.filter((p) => p.id !== apexSpecialProjectId);
  });

  // =========================================================================
  // 4. Role-based Authorization & Security Checks
  // =========================================================================

  await t.test('4.1 Employee (David Miller) is denied access to AI Assistant query', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which projects are overdue?' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
  });

  await t.test('4.2 Employee is denied access to AI usage telemetry', async () => {
    const res = await request(app)
      .get('/api/v1/ai/usage')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
  });

  await t.test('4.3 Unauthenticated request receives 401 Authentication Required', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which projects are overdue?' });

    assert.equal(res.status, 401);
  });

  // =========================================================================
  // 5. Input Validation
  // =========================================================================

  await t.test('5.1 Query validation: empty string rejected with 400', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: '   ' });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.code === 'VALIDATION_ERROR' || res.body.error.code === 'INVALID_AI_QUERY');
  });

  await t.test('5.2 Query validation: query too short rejected', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'hi' });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.code === 'VALIDATION_ERROR' || res.body.error.code === 'INVALID_AI_QUERY');
  });

  await t.test('5.3 Query validation: query exceeding 500 chars rejected', async () => {
    const longQuery = 'A'.repeat(501);
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: longQuery });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.code === 'VALIDATION_ERROR' || res.body.error.code === 'INVALID_AI_QUERY');
  });

  // =========================================================================
  // 6. Rate Limiting Protection
  // =========================================================================

  await t.test('6.1 Rate limiting enforces 30 requests per minute ceiling', async () => {
    aiRateLimiter.clear();
    const sarahUserId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const rateLimitTestKey = `ai_rate_${ACME_TENANT_ID}_${sarahUserId}`;

    // Fill rate limiter up to max (30)
    for (let i = 0; i < 30; i++) {
      aiRateLimiter.record(rateLimitTestKey);
    }

    // The 31st request must trigger HTTP 429
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which projects are overdue?' });

    assert.equal(res.status, 429);
    assert.equal(res.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(res.headers['retry-after'], 'Must contain Retry-After header');

    // Clean up
    aiRateLimiter.clear();
  });

  // =========================================================================
  // 7. Telemetry & Usage Tracking
  // =========================================================================

  await t.test('7.1 GET /api/v1/ai/usage returns telemetry and intent breakdown', async () => {
    // Run a query to ensure usage is recorded
    await request(app)
      .post('/api/v1/ai/query')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ query: 'Which inventory items are below minimum stock?' });

    const res = await request(app)
      .get('/api/v1/ai/usage')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.total_queries === 'number');
    assert.ok(res.body.data.total_queries > 0);
    assert.ok(typeof res.body.data.average_duration_ms === 'number');
    assert.ok(res.body.data.intent_breakdown !== undefined);
    assert.ok(res.body.data.intent_breakdown.LOW_STOCK_INVENTORY >= 1);
  });

  // =========================================================================
  // 8. Super Admin AI Telemetry Access
  // =========================================================================

  await t.test('8.1 Platform Super Admin can inspect AI usage for any tenant', async () => {
    const res = await request(app)
      .get('/api/v1/ai/usage')
      .set('Authorization', SUPERADMIN_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total_queries >= 1);
  });
});
