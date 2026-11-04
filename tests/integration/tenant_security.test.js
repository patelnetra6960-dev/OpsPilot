import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Multi-Tenant Boundary Enforcement', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner

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
});
