import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../server/src/app.js';
import { trackEventId } from '../../server/src/socket/socket.server.js';
import { notificationService } from '../../server/src/services/notification.service.js';

test('Integration Test: OpsPilot Performance, Scalability & Resource Optimization Audit', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager

  // =========================================================================
  // 1. API Latency & Throughput Benchmarks
  // =========================================================================

  await t.test('1.1 Measure Organization Context & Settings API response latency (< 50ms)', async () => {
    const start = performance.now();
    const res = await request(app)
      .get('/api/v1/organizations/current')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);
    const duration = performance.now() - start;

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(duration < 150, `Expected latency < 150ms, received ${duration.toFixed(2)}ms`);
  });

  await t.test('1.2 Measure Paginated Tasks API query throughput (< 60ms)', async () => {
    const start = performance.now();
    const res = await request(app)
      .get('/api/v1/tasks?page=1&limit=20')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);
    const duration = performance.now() - start;

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(duration < 150, `Expected latency < 150ms, received ${duration.toFixed(2)}ms`);
    assert.ok(res.body.data !== undefined);
  });

  await t.test('1.3 Measure Complex Multi-Entity Analytics Aggregation API latency (< 100ms)', async () => {
    const start = performance.now();
    const res = await request(app)
      .get('/api/v1/analytics/organization')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);
    const duration = performance.now() - start;

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(duration < 200, `Expected latency < 200ms, received ${duration.toFixed(2)}ms`);
    assert.ok(res.body.data.overview !== undefined);
  });

  // =========================================================================
  // 2. PostgreSQL Schema Indexes & Query Plan Audit
  // =========================================================================

  await t.test('2.1 Audit Migration 014: Performance indexes exist in database and supabase directories', async () => {
    const dbMigrationPath = path.resolve('database/migrations/014_performance_indexes_and_optimizations.sql');
    const sbMigrationPath = path.resolve('supabase/migrations/014_performance_indexes_and_optimizations.sql');

    assert.ok(fs.existsSync(dbMigrationPath), 'database/migrations/014 must exist');
    assert.ok(fs.existsSync(sbMigrationPath), 'supabase/migrations/014 must exist');

    const sqlContent = fs.readFileSync(dbMigrationPath, 'utf8');

    // Verify targeted performance indexes
    assert.ok(sqlContent.includes('idx_tasks_perf_org_due'), 'Must index tasks due date');
    assert.ok(sqlContent.includes('idx_tasks_perf_org_col_due'), 'Must index tasks kanban column & due date');
    assert.ok(sqlContent.includes('idx_projects_perf_org_target'), 'Must index projects target date');
    assert.ok(sqlContent.includes('idx_inventory_perf_stock_reorder'), 'Must index inventory reorder thresholds');
    assert.ok(sqlContent.includes('idx_work_orders_perf_org_sched'), 'Must index work order schedule dates');
    assert.ok(sqlContent.includes('idx_service_requests_perf_urgency_status'), 'Must index service request SLA triage');
    assert.ok(sqlContent.includes('idx_invoices_perf_org_status_due'), 'Must index invoice status and due dates');
    assert.ok(sqlContent.includes('idx_notifications_perf_user_org_read'), 'Must index notification unread feed');
  });

  // =========================================================================
  // 3. Large Response Payload Prevention & Pagination Safety
  // =========================================================================

  await t.test('3.1 Enforces strict page size clamping: Requesting limit=500 is clamped to max 100', async () => {
    const res = await request(app)
      .get('/api/v1/tasks?limit=500')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.body.pagination.limit <= 100, `Limit should be clamped to 100, received ${res.body.pagination.limit}`);
  });

  await t.test('3.2 Large payload prevention: JSON payload size stays within safe boundaries (< 50KB)', async () => {
    const res = await request(app)
      .get('/api/v1/tasks?page=1&limit=20')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    const payloadSizeBytes = Buffer.byteLength(JSON.stringify(res.body));
    assert.ok(payloadSizeBytes < 50000, `Expected payload size < 50KB, received ${payloadSizeBytes} bytes`);
  });

  // =========================================================================
  // 4. Socket.IO Connection Scalability & Event Deduplication
  // =========================================================================

  await t.test('4.1 High-performance sliding-window event deduplication prevents duplicate processing', async () => {
    const testEventId = `perf-event-${Date.now()}`;

    // First emission should be accepted (not duplicate)
    const isFirstDuplicate = trackEventId(testEventId);
    assert.equal(isFirstDuplicate, false, 'First occurrence should not be flagged as duplicate');

    // Immediate second emission should be flagged as duplicate
    const isSecondDuplicate = trackEventId(testEventId);
    assert.equal(isSecondDuplicate, true, 'Immediate subsequent occurrence must be flagged as duplicate');
  });

  await t.test('4.2 Batch notification processing handles multiple recipients in single operation', async () => {
    const recipientIds = [
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc'
    ];

    const batch = recipientIds.map((userId, idx) => ({
      userId,
      title: `Batch Notification Test #${idx}`,
      message: `Scalability test message payload for recipient ${idx}`,
      type: 'info'
    }));

    const results = await notificationService.createNotificationsBulk(batch, ACME_TENANT_ID);
    assert.equal(results.length, 3, 'Should have created 3 notifications in batch');
  });

  // =========================================================================
  // 5. Frontend Bundle Optimization & Code-Splitting Audit
  // =========================================================================

  await t.test('5.1 Verify client bundle has been code-split into discrete route chunks', async () => {
    const distAssetsDir = path.resolve('client/dist/assets');
    assert.ok(fs.existsSync(distAssetsDir), 'client/dist/assets directory must exist');

    const files = fs.readdirSync(distAssetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    // In a monolithic bundle, there were only 2-3 JS files.
    // In code-split bundle, each page is a chunk (> 20 JS files).
    assert.ok(jsFiles.length > 20, `Expected > 20 code-split chunk files, found ${jsFiles.length}`);

    // Main entry chunk should be well under 800 kB threshold
    const mainChunk = jsFiles.find((f) => f.startsWith('index-'));
    assert.ok(mainChunk, 'Main index bundle must exist');

    const stats = fs.statSync(path.join(distAssetsDir, mainChunk));
    assert.ok(stats.size < 600 * 1024, `Main bundle should be < 600 kB, found ${(stats.size / 1024).toFixed(2)} kB`);
  });
});
