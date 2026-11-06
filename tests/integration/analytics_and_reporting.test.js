import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Analytics, Business Intelligence & Reporting Module', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner
  const SUPERADMIN_TOKEN = 'Bearer mock-token-superadmin'; // Platform Super Admin

  // =========================================================================
  // 1. Organization Executive Dashboard Analytics
  // =========================================================================

  await t.test('Owner can retrieve complete organization analytics with 10 core metrics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/organization?range=30d')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // 1. Total Employees
    assert.equal(data.overview.totalEmployees, 3, 'Acme must have 3 active employees');
    // 2. Total Customers
    assert.equal(data.overview.totalCustomers, 3, 'Acme must have 3 customers');
    // 3. Active Projects
    assert.equal(data.overview.activeProjects, 2, 'Acme must have 2 active projects');
    // 4. Completed Projects
    assert.equal(data.overview.completedProjects, 0);
    // 5. Pending Tasks
    assert.ok(data.overview.pendingTasks >= 0, 'Pending tasks count must exist');
    // 6. Overdue Tasks
    assert.ok(data.overview.overdueTasks >= 0, 'Overdue tasks count must exist');
    // 7. Service Request Volume
    assert.equal(data.overview.serviceRequestVolume, 3, 'Acme must have 3 service requests');
    // 8. Work Order Completion Rate
    assert.equal(data.overview.totalWorkOrders, 2, 'Acme must have 2 work orders');
    assert.equal(typeof data.overview.workOrderCompletionRate, 'number');
    // 9. Expense Summaries
    assert.equal(data.expenses.totalClaims, 3);
    assert.ok(data.expenses.approvedAmount >= 380, 'Approved expenses must be at least $380');
    assert.equal(data.expenses.pendingAmount, 145.5, 'Pending expense must be $145.50');
    // 10. Invoice Summaries
    assert.ok(data.invoices.totalBilled > 0, 'Invoices total billed must be greater than zero');
    assert.ok(typeof data.invoices.totalPaid === 'number');

    // Visual trend series & comparisons
    assert.ok(Array.isArray(data.trends.monthlyRevenueVsExpense));
    assert.ok(data.comparisons);
    assert.equal(data.period.range, '30d');
  });

  await t.test('Multi-tenant data isolation: Apex metrics are completely isolated from Acme', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/organization?range=30d')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.equal(data.overview.totalEmployees, 2, 'Apex has 2 employees');
    assert.equal(data.overview.totalCustomers, 1, 'Apex has 1 customer');
    assert.equal(data.overview.activeProjects, 0, 'Apex has 0 projects');
    assert.equal(data.overview.totalTasks, 0, 'Apex has 0 tasks');
    assert.equal(data.overview.totalWorkOrders, 1, 'Apex has 1 work order');
    assert.equal(data.expenses.totalClaims, 1, 'Apex has 1 expense claim');
  });

  await t.test('Cross-tenant boundary enforcement: Marcus cannot access Acme analytics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/organization')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  await t.test('Employee role privacy boundary: Financial metrics sanitized for ordinary staff', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/organization')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    const data = res.body.data;

    // Basic operational metrics are visible
    assert.equal(data.overview.totalEmployees, 3);
    assert.equal(data.overview.totalWorkOrders, 2);

    // Confidential financial totals are masked/nullified
    assert.equal(data.expenses.approvedAmount, null);
    assert.equal(data.invoices.totalBilled, null);
    assert.equal(data.invoices.totalPaid, null);
    assert.equal(data.trends.monthlyRevenueVsExpense.length, 0);
  });

  // =========================================================================
  // 2. Manager Dashboard Analytics
  // =========================================================================

  await t.test('Manager retrieves team productivity, workload, and overdue task telemetry', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/manager')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Team Productivity
    assert.equal(data.productivity.totalTasks, 6);
    assert.equal(typeof data.productivity.completionRate, 'number');
    assert.ok(Array.isArray(data.productivity.weeklyVelocity));

    // Employee Workload Table
    assert.ok(Array.isArray(data.workload));
    assert.equal(data.workload.length, 3);
    data.workload.forEach((member) => {
      assert.ok(member.name);
      assert.ok(member.email);
      assert.equal(typeof member.assignedTasks, 'number');
      assert.equal(typeof member.workloadScore, 'number');
    });

    // Project Status Breakdown
    assert.equal(data.projects.total, 2);
    assert.ok(data.projects.byStatus);
    assert.ok(data.projects.byHealth);
    assert.ok(Array.isArray(data.projects.items));

    // Overdue Tasks Queue
    assert.equal(typeof data.overdueTasks.count, 'number');
    assert.ok(Array.isArray(data.overdueTasks.items));
  });

  await t.test('Employee is forbidden from accessing manager analytics dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/manager')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
  });

  // =========================================================================
  // 3. Super Admin Platform Analytics
  // =========================================================================

  await t.test('Super Admin retrieves platform-wide registered organizations & SaaS telemetry', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/platform')
      .set('Authorization', SUPERADMIN_TOKEN);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Platform-level statistics
    assert.ok(data.platform.totalOrganizations >= 2);
    assert.ok(data.platform.activeOrganizations >= 2);
    assert.ok(data.platform.totalUsers >= 5);
    assert.ok(data.platform.totalWorkOrders >= 3);
    assert.ok(data.platform.totalPlatformVolume > 0);
    assert.ok(data.platform.byTier.enterprise >= 1);

    // Organization Activity Table
    assert.ok(Array.isArray(data.organizationActivity));
    assert.ok(data.organizationActivity.length >= 2);
    const acmeActivity = data.organizationActivity.find((o) => o.id === ACME_TENANT_ID);
    assert.ok(acmeActivity);
    assert.equal(acmeActivity.tier, 'enterprise');
    assert.ok(acmeActivity.workOrderCount >= 2);

    // Growth Timeline
    assert.ok(Array.isArray(data.growthTimeline));
  });

  await t.test('Ordinary organization owner is forbidden from accessing platform analytics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/platform')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  // =========================================================================
  // 4. Date Range Filters & Query Validation
  // =========================================================================

  await t.test('Supports 7d, 30d, 90d, and year date range filters', async () => {
    const ranges = ['7d', '30d', '90d', 'year'];
    for (const range of ranges) {
      const res = await request(app)
        .get(`/api/v1/analytics/organization?range=${range}`)
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.period.range, range);
      assert.ok(res.body.data.period.startDate);
      assert.ok(res.body.data.period.endDate);
    }
  });

  await t.test('Rejects invalid date range query parameters with 400 Validation Error', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/organization?range=invalid-range')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // =========================================================================
  // 5. Exportable Reports (CSV)
  // =========================================================================

  await t.test('Exports Executive Organization Report as formatted CSV attachment', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export?type=executive&range=30d')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.headers['content-disposition'].includes('attachment'));
    assert.ok(res.text.includes('OpsPilot Organization Executive Analytics Report'));
    assert.ok(res.text.includes('Total Employees,3'));
    assert.ok(res.text.includes('Total Customers,3'));
    assert.ok(res.text.includes('Total Approved Expenses,'));
  });

  await t.test('Exports Manager Workload & Productivity Report as formatted CSV', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export?type=manager')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('OpsPilot Manager Productivity & Workload Report'));
    assert.ok(res.text.includes('Employee Name,Email,Role,Department'));
    assert.ok(res.text.includes('Total Tasks,6'));
  });

  await t.test('Super Admin can export Platform Statistics CSV', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export?type=platform')
      .set('Authorization', SUPERADMIN_TOKEN);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('OpsPilot Platform Executive Analytics Report'));
    assert.ok(res.text.includes('Total Organizations'));
    assert.ok(res.text.includes('Acme Logistics Global'));
  });

  await t.test('Non-superadmin is blocked from exporting platform report', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/export?type=platform')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });
});
