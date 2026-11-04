import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

test('OpsPilot Multi-Tenant & Backend Security Test Suite', async (t) => {
  const ACME_ORG_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_ORG_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Owner of Acme
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Owner of Apex

  await t.test('1. Healthcheck endpoint returns operational status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.features.multiTenancy, 'active');
  });

  await t.test('2. Unauthenticated request to workforce returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/workforce');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('3. Authenticated request missing X-Tenant-Id returns 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/workforce')
      .set('Authorization', ALEX_TOKEN);
    
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'TENANT_HEADER_REQUIRED');
  });

  await t.test('4. Cross-Tenant Breach Prevention: User Marcus trying to access Acme tenant returns 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/workforce')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', ACME_ORG_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  await t.test('5. Tenant Isolation: User Alex accessing Acme tenant receives ONLY Acme data', async () => {
    const res = await request(app)
      .get('/api/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_ORG_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3);
    
    // Ensure every single returned record belongs to Acme
    res.body.data.forEach((member) => {
      assert.equal(member.organization_id, ACME_ORG_ID);
    });

    // Ensure no Apex member leaked
    const hasApex = res.body.data.some((m) => m.employee_code.includes('APEX'));
    assert.equal(hasApex, false, 'Security flaw: Apex member leaked into Acme tenant view!');
  });

  await t.test('6. Tenant Isolation: User Marcus accessing Apex tenant receives ONLY Apex data', async () => {
    const res = await request(app)
      .get('/api/workforce')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_ORG_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2);

    res.body.data.forEach((member) => {
      assert.equal(member.organization_id, APEX_ORG_ID);
    });

    const hasAcme = res.body.data.some((m) => m.employee_code.includes('ACME'));
    assert.equal(hasAcme, false, 'Security flaw: Acme member leaked into Apex tenant view!');
  });

  await t.test('7. Organization Discovery: User Alex sees only their affiliated organizations', async () => {
    const res = await request(app)
      .get('/api/organizations/my')
      .set('Authorization', ALEX_TOKEN);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, ACME_ORG_ID);
  });
});
