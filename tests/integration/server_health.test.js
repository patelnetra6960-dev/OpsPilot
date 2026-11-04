import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Server Health & Diagnostics', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'healthy');
  assert.equal(response.body.data.features.multiTenancy, 'active');
  assert.equal(response.body.data.features.databaseRLS, 'enforced');
});
