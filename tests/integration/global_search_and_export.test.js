import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Global Search, Multi-Field Filters & Permission-Aware Data Export (Prompt 25)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Manager

  // =========================================================================
  // 1. Global Multi-Entity Search Capabilities
  // =========================================================================

  await t.test('1.1 Manager searches across all domain entities with default pagination', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    // Validate search envelope structure
    const first = res.body.data[0];
    assert.ok(first.id);
    assert.ok(first.entity_type);
    assert.ok(first.title);
    assert.ok(first.url);

    // Validate pagination envelope
    assert.ok(res.body.pagination);
    assert.equal(res.body.pagination.page, 1);
    assert.ok(res.body.pagination.totalItems > 0);
  });

  await t.test('1.2 Keyword search accurately finds entities by query string', async () => {
    const res = await request(app)
      .get('/api/search?q=David')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length > 0);
    const hasDavid = res.body.data.some(
      (item) => item.title.includes('David') || item.subtitle.includes('David')
    );
    assert.ok(hasDavid, 'Should find item containing David');
  });

  await t.test('1.3 Filter by specific entity category: type=tasks', async () => {
    const res = await request(app)
      .get('/api/search?type=tasks')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const item of res.body.data) {
      assert.equal(item.entity_type, 'tasks');
    }
  });

  await t.test('1.4 Filter by specific entity category: type=inventory', async () => {
    const res = await request(app)
      .get('/api/search?type=inventory')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const item of res.body.data) {
      assert.equal(item.entity_type, 'inventory');
    }
  });

  await t.test('1.5 Filter by specific entity category: type=invoices', async () => {
    const res = await request(app)
      .get('/api/search?type=invoices')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const item of res.body.data) {
      assert.equal(item.entity_type, 'invoices');
    }
  });

  await t.test('1.6 Priority filter filters items matching specified priority', async () => {
    const res = await request(app)
      .get('/api/search?type=tasks&priority=high')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const item of res.body.data) {
      assert.equal(item.priority.toLowerCase(), 'high');
    }
  });

  await t.test('1.7 Sorting and pagination metadata enforcement', async () => {
    const res = await request(app)
      .get('/api/search?limit=3&page=1&sortBy=title&sortOrder=asc')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 3);
    assert.equal(res.body.pagination.page, 1);
    assert.equal(res.body.pagination.limit, 3);
    assert.equal(res.body.pagination.hasNextPage, true);

    // Verify alphabetical ascending order
    if (res.body.data.length >= 2) {
      assert.ok(
        res.body.data[0].title.toLowerCase() <= res.body.data[1].title.toLowerCase(),
        'First item title should be <= second item title'
      );
    }
  });

  await t.test('1.8 Unrestricted query prevention rejects page limits > 100', async () => {
    const res = await request(app)
      .get('/api/search?limit=500')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error || res.body);
    assert.ok(errText.includes('100'));
  });

  await t.test('1.9 Unmatched keyword gracefully returns empty results', async () => {
    const res = await request(app)
      .get('/api/search?q=NONEXISTENT_XYZ_QUERY_STRING_999999')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 0);
    assert.equal(res.body.pagination.totalItems, 0);
  });

  // =========================================================================
  // 2. Permission-Aware Search Isolation
  // =========================================================================

  await t.test('2.1 Customer role cannot view workforce, internal inventory, or other customers in search', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    for (const item of res.body.data) {
      assert.notEqual(item.entity_type, 'employees', 'Customer must not see employees');
      assert.notEqual(item.entity_type, 'inventory', 'Customer must not see inventory');
      assert.notEqual(item.entity_type, 'customers', 'Customer must not see customer directory');
    }
  });

  await t.test('2.2 Regular employee role cannot view company billing invoices in search', async () => {
    const res = await request(app)
      .get('/api/search?type=invoices')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // Employee is excluded from seeing invoices
    assert.equal(res.body.data.length, 0, 'Employee cannot see company invoices in search');
  });

  // =========================================================================
  // 3. Permission-Aware Data Export (CSV & JSON)
  // =========================================================================

  await t.test('3.1 Manager exports tasks to RFC 4180 CSV with correct headers', async () => {
    const res = await request(app)
      .get('/api/export?entity=tasks')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.headers['content-disposition'].includes('attachment; filename="tasks-export-'));
    assert.ok(res.text.includes('Task ID,Title,Status,Priority,Due Date,Project ID'));
  });

  await t.test('3.2 Manager exports inventory items to CSV', async () => {
    const res = await request(app)
      .get('/api/export?entity=inventory')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('SKU,Item Name,Category,Quantity In Stock,Unit Cost ($),Location,Status'));
  });

  await t.test('3.3 Manager exports invoices to CSV', async () => {
    const res = await request(app)
      .get('/api/export?entity=invoices')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Invoice Number,Client,Issue Date,Due Date,Subtotal ($),Tax ($),Total ($)'));
  });

  await t.test('3.4 Manager exports workforce to CSV', async () => {
    const res = await request(app)
      .post('/api/export')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ entity: 'employees' });

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Employee Code,First Name,Last Name,Email,Department,Designation'));
  });

  await t.test('3.5 Manager exports customers to CSV', async () => {
    const res = await request(app)
      .post('/api/export')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ entity: 'customers' });

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Customer Code,Name,Contact Person,Email,Phone,SLA Tier,Status'));
  });

  await t.test('3.6 Export to JSON format returns structured JSON envelope', async () => {
    const res = await request(app)
      .post('/api/export')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ entity: 'projects', format: 'json' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  await t.test('3.7 Export limit restriction rejects values > 1000', async () => {
    const res = await request(app)
      .get('/api/export?entity=tasks&limit=5000')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error || res.body);
    assert.ok(errText.includes('1000'));
  });

  // =========================================================================
  // 4. Role Authorization & Cross-Tenant Boundary Enforcement
  // =========================================================================

  await t.test('4.1 Customer attempting to export employees receives 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/export?entity=employees')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error || res.body);
    assert.ok(errText.includes('Customer'));
  });

  await t.test('4.2 Customer attempting to export inventory receives 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/export?entity=inventory')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  await t.test('4.3 Regular employee attempting to export invoices receives 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/export?entity=invoices')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error || res.body);
    assert.ok(errText.includes('Employee'));
  });

  await t.test('4.4 Customer can export their own permitted service requests', async () => {
    const res = await request(app)
      .get('/api/export?entity=service_requests')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Request Code,Title,Category,Priority,Status'));
  });

  await t.test('4.5 Cross-tenant export attempt rejected with 403 Forbidden', async () => {
    // Marcus belongs to Apex (APEX_TENANT_ID), attempting to query Acme (ACME_TENANT_ID)
    assert.ok(APEX_TENANT_ID);
    const res = await request(app)
      .get('/api/export?entity=tasks')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  await t.test('4.6 Cross-tenant search attempt rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });
});
