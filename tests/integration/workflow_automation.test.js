import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';
import { mockDatabase } from '../../server/src/config/supabase.js';
import { ReliableJobQueue } from '../../server/src/jobs/reliable.queue.js';
import { automationService } from '../../server/src/services/automation.service.js';
import { deduplicationService } from '../../server/src/services/deduplication.service.js';
import { queueService } from '../../server/src/jobs/queue.service.js';
import { workflowScheduler } from '../../server/src/jobs/workflow.scheduler.js';

test('Integration Test: Workflow Automation & Background Processing Module', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Staff/Employee
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner

  // Initialize scheduler and clear deduplication state before tests
  await workflowScheduler.initialize();
  deduplicationService.clear();

  t.after(async () => {
    await workflowScheduler.stop();
    await queueService.closeAll();
  });

  // =========================================================================
  // 1. Background Job Queue Engine: Lifecycle, Idempotency & Retries
  // =========================================================================

  await t.test('Queue Engine: Processes jobs asynchronously, tracks lifecycle, and returns result', async () => {
    const testQueue = new ReliableJobQueue('test-lifecycle', { concurrency: 2 });
    let jobExecuted = false;

    testQueue.process(async (job) => {
      assert.equal(job.data.payload, 'ops-unit-1');
      jobExecuted = true;
      return { status: 'processed', count: 42 };
    });

    const job = await testQueue.add('test-task', { payload: 'ops-unit-1' });
    assert.ok(job.id);
    assert.equal(job.name, 'test-task');

    // Wait for event loop to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    const completedJob = await testQueue.getJob(job.id);
    assert.equal(jobExecuted, true);
    assert.equal(completedJob.status, 'completed');
    assert.deepEqual(completedJob.returnvalue, { status: 'processed', count: 42 });

    const counts = await testQueue.getJobCounts();
    assert.equal(counts.completed, 1);
    assert.equal(counts.failed, 0);
    await testQueue.close();
  });

  await t.test('Queue Engine: Idempotency prevents duplicate waiting/active jobs with same jobId', async () => {
    const testQueue = new ReliableJobQueue('test-idempotency', { concurrency: 1 });
    let executionCount = 0;

    testQueue.process(async () => {
      executionCount++;
      await new Promise((r) => setTimeout(r, 100)); // Simulate work
      return 'done';
    });

    const job1 = await testQueue.add('task', { v: 1 }, { jobId: 'idempotent-job-1' });
    const job2 = await testQueue.add('task', { v: 2 }, { jobId: 'idempotent-job-1' });

    // Should return the exact same job instance, not a duplicate
    assert.equal(job1.id, job2.id);

    const counts = await testQueue.getJobCounts();
    assert.equal(counts.total, 1, 'Total jobs in queue must be 1');

    await new Promise((r) => setTimeout(r, 150));
    assert.equal(executionCount, 1);
    await testQueue.close();
  });

  await t.test('Queue Engine: Retry policy with exponential backoff on transient errors and failed DLQ', async () => {
    const testQueue = new ReliableJobQueue('test-retries', { concurrency: 1 });
    let attempts = 0;

    testQueue.process(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Transient failure attempt ${attempts}`);
      }
      return 'recovered';
    });

    // Configure 3 attempts with 20ms initial backoff
    const job = await testQueue.add(
      'retry-task',
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 20 } }
    );

    // Wait for retries to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    const finishedJob = await testQueue.getJob(job.id);
    assert.equal(finishedJob.status, 'completed');
    assert.equal(finishedJob.returnvalue, 'recovered');
    assert.equal(finishedJob.attemptsMade, 2); // Succeeded on attempt 3 (attemptsMade was 2 when retrying)
    await testQueue.close();
  });

  await t.test('Queue Engine: Permanently failed jobs are moved to Dead Letter Queue and support manual retry', async () => {
    const testQueue = new ReliableJobQueue('test-dlq', { concurrency: 1 });
    let willFail = true;

    testQueue.process(async () => {
      if (willFail) {
        throw new Error('Fatal database connection error');
      }
      return 'recovered-after-fix';
    });

    const job = await testQueue.add('fatal-task', {}, { attempts: 1 });
    await new Promise((r) => setTimeout(r, 50));

    const failedJob = await testQueue.getJob(job.id);
    assert.equal(failedJob.status, 'failed');
    assert.ok(failedJob.failedReason.includes('Fatal database connection error'));

    const counts = await testQueue.getJobCounts();
    assert.equal(counts.failed, 1);

    // Fix underlying issue and trigger manual retry
    willFail = false;
    await testQueue.retryJob(job.id);

    await new Promise((r) => setTimeout(r, 50));
    const retriedJob = await testQueue.getJob(job.id);
    assert.equal(retriedJob.status, 'completed');
    assert.equal(retriedJob.returnvalue, 'recovered-after-fix');
    await testQueue.close();
  });

  // =========================================================================
  // 2. Business Workflow: Overdue Task Detection
  // =========================================================================

  await t.test('Workflow 1: Overdue task detection flags tasks and sends deduplicated reminders', async () => {
    // Seed an overdue task
    const overdueTaskId = 'task-overdue-test-01';
    mockDatabase.tasks = mockDatabase.tasks || [];
    mockDatabase.tasks.push({
      id: overdueTaskId,
      organization_id: ACME_TENANT_ID,
      title: 'Emergency Generator Load Testing',
      status: 'in_progress',
      due_date: '2026-01-01T00:00:00.000Z',
      assignee_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', // David
      created_at: '2025-12-01T00:00:00.000Z',
      updated_at: '2025-12-01T00:00:00.000Z'
    });

    const res1 = await automationService.detectOverdueTasks({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T12:00:00Z')
    });

    assert.equal(res1.workflow, 'tasks.overdue_detection');
    assert.ok(res1.overdueFound >= 1);
    assert.ok(res1.remindersSent >= 1);

    // Verify task status was updated to 'overdue'
    const updatedTask = mockDatabase.tasks.find((t) => t.id === overdueTaskId);
    assert.equal(updatedTask.status, 'overdue');

    // Deduplication check: Running again immediately should NOT send duplicate reminders
    const res2 = await automationService.detectOverdueTasks({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T12:05:00Z')
    });
    assert.equal(res2.remindersSent, 0, 'Must send 0 duplicate reminders within cooldown window');
  });

  // =========================================================================
  // 3. Business Workflow: Upcoming Deadline Reminders
  // =========================================================================

  await t.test('Workflow 2: Upcoming deadline reminders alert assignees and deduplicate alerts', async () => {
    const upcomingTaskId = 'task-deadline-test-01';
    const now = new Date('2026-11-06T10:00:00Z');
    const dueDate = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours from now

    mockDatabase.tasks.push({
      id: upcomingTaskId,
      organization_id: ACME_TENANT_ID,
      title: 'HVAC Air Filter Replacement',
      status: 'pending',
      due_date: dueDate,
      assignee_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      created_at: now.toISOString()
    });

    const res1 = await automationService.checkUpcomingDeadlines({
      organizationId: ACME_TENANT_ID,
      now,
      windowHours: 24
    });

    assert.ok(res1.upcomingFound >= 1);
    assert.ok(res1.remindersSent >= 1);

    // Deduplication check
    const res2 = await automationService.checkUpcomingDeadlines({
      organizationId: ACME_TENANT_ID,
      now: new Date(now.getTime() + 30 * 60 * 1000), // 30 mins later
      windowHours: 24
    });
    assert.equal(res2.remindersSent, 0, 'Duplicate deadline reminder must be prevented');
  });

  // =========================================================================
  // 4. Business Workflow: Low-Stock Automated Notifications
  // =========================================================================

  await t.test('Workflow 3: Low-stock notifications alert managers when inventory falls below threshold', async () => {
    const lowStockItemId = 'inv-item-low-stock-01';
    mockDatabase.inventory_items = mockDatabase.inventory_items || [];
    mockDatabase.inventory_items.push({
      id: lowStockItemId,
      organization_id: ACME_TENANT_ID,
      name: 'Cat6 Ethernet Patch Cable 10m',
      sku: 'NET-CAT6-10M',
      quantity: 3,
      min_stock_threshold: 15,
      reorder_threshold: 15,
      created_at: new Date().toISOString()
    });

    const res1 = await automationService.checkLowStockAlerts({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T14:00:00Z')
    });

    assert.ok(res1.lowStockFound >= 1);
    assert.ok(res1.alertsSent >= 1);

    // Deduplication check
    const res2 = await automationService.checkLowStockAlerts({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T15:00:00Z')
    });
    assert.equal(res2.alertsSent, 0, 'Low-stock notification must not spam repeatedly');
  });

  // =========================================================================
  // 5. Business Workflow: Customer Service Request SLA Escalation
  // =========================================================================

  await t.test('Workflow 4: Service request SLA breach escalates priority tier', async () => {
    const reqId = 'sr-escalate-test-01';
    mockDatabase.serviceRequests = mockDatabase.serviceRequests || [];
    mockDatabase.serviceRequests.push({
      id: reqId,
      organization_id: ACME_TENANT_ID,
      ticket_number: 'SR-2026-999',
      title: 'Water Leak in Server Room A',
      status: 'submitted',
      priority: 'high', // 24h SLA
      is_escalated: false,
      created_at: new Date('2026-11-05T08:00:00Z').toISOString() // 30 hours ago relative to test now
    });

    const res1 = await automationService.escalateServiceRequests({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T14:00:00Z') // 30h elapsed
    });

    assert.ok(res1.escalatedCount >= 1);
    const escalatedReq = mockDatabase.serviceRequests.find((r) => r.id === reqId);
    assert.equal(escalatedReq.is_escalated, true);
    assert.equal(escalatedReq.priority, 'urgent'); // Escalated from high to urgent

    // Second run should not re-escalate
    const res2 = await automationService.escalateServiceRequests({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T14:30:00Z')
    });
    assert.equal(res2.escalatedCount, 0);
  });

  // =========================================================================
  // 6. Business Workflow: Expense Approval Reminders
  // =========================================================================

  await t.test('Workflow 5: Pending expense claims trigger approval reminders to managers', async () => {
    const expenseId = 'exp-approval-remind-01';
    mockDatabase.expenses = mockDatabase.expenses || [];
    mockDatabase.expenses.push({
      id: expenseId,
      organization_id: ACME_TENANT_ID,
      user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      employee_name: 'David Kim',
      amount: 450.0,
      category: 'Equipment',
      status: 'pending',
      submitted_at: new Date('2026-11-03T10:00:00Z').toISOString() // 72 hours ago
    });

    const res1 = await automationService.sendExpenseApprovalReminders({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T10:00:00Z'),
      pendingAgeHours: 48
    });

    assert.ok(res1.remindersSent >= 1);

    // Deduplication check
    const res2 = await automationService.sendExpenseApprovalReminders({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T11:00:00Z'),
      pendingAgeHours: 48
    });
    assert.equal(res2.remindersSent, 0);
  });

  // =========================================================================
  // 7. Business Workflow: Invoice Due Reminders
  // =========================================================================

  await t.test('Workflow 6: Overdue invoices are updated and upcoming invoices trigger notices', async () => {
    const overdueInvId = 'inv-due-test-01';
    mockDatabase.invoices = mockDatabase.invoices || [];
    mockDatabase.invoices.push({
      id: overdueInvId,
      organization_id: ACME_TENANT_ID,
      invoice_number: 'INV-2026-888',
      total_amount: 1250.0,
      status: 'sent',
      due_date: '2026-11-01T00:00:00Z',
      customer_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      created_at: '2026-10-15T00:00:00Z'
    });

    const res = await automationService.sendInvoiceDueReminders({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T12:00:00Z'),
      upcomingDays: 3
    });

    assert.ok(res.overdueCount >= 1);
    assert.ok(res.remindersSent >= 1);

    const updatedInv = mockDatabase.invoices.find((i) => i.id === overdueInvId);
    assert.equal(updatedInv.status, 'overdue');
  });

  // =========================================================================
  // 8. Business Workflow: Scheduled Executive Reports
  // =========================================================================

  await t.test('Workflow 7: Scheduled executive reports synthesize telemetry respecting organization timezone', async () => {
    const res = await automationService.generateScheduledReports({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T08:00:00Z'),
      reportType: 'daily'
    });

    assert.equal(res.workflow, 'analytics.scheduled_reports');
    assert.equal(res.status, 'completed');
    assert.equal(res.summary.organizationName, 'Acme Logistics Global');
    assert.ok(typeof res.summary.activeProjects === 'number');

    // Deduplication check: Second generation on same local day is suppressed
    const res2 = await automationService.generateScheduledReports({
      organizationId: ACME_TENANT_ID,
      now: new Date('2026-11-06T08:30:00Z'),
      reportType: 'daily'
    });
    assert.equal(res2.status, 'already_generated');
  });

  // =========================================================================
  // 9. Asynchronous HTTP APIs: Immediate 202 Response & Config Management
  // =========================================================================

  await t.test('API: POST /api/v1/automations/trigger returns HTTP 202 Accepted without blocking HTTP caller', async () => {
    const res = await request(app)
      .post('/api/v1/automations/trigger')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        workflow: 'workflows.all'
      });

    assert.equal(res.status, 202);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.jobId);
    assert.equal(res.body.data.workflow, 'workflows.all');
    assert.ok(['waiting', 'active', 'completed'].includes(res.body.data.status));
  });

  await t.test('API: GET and PUT /api/v1/automations/config manages organization rules', async () => {
    const getRes = await request(app)
      .get('/api/v1/automations/config')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.success, true);
    assert.equal(getRes.body.data.organizationId, ACME_TENANT_ID);
    assert.equal(getRes.body.data.automation.overdueTasks, true);

    // Update config
    const putRes = await request(app)
      .put('/api/v1/automations/config')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        lowStockThreshold: 20,
        upcomingDeadlineHours: 48
      });

    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.data.automation.lowStockThreshold, 20);
    assert.equal(putRes.body.data.automation.upcomingDeadlineHours, 48);
  });

  await t.test('API: GET /api/v1/automations/queue/metrics provides background queue health', async () => {
    const res = await request(app)
      .get('/api/v1/automations/queue/metrics')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.metrics);
    assert.equal(typeof res.body.data.metrics.total, 'number');
  });

  // =========================================================================
  // 10. Multi-Tenant Boundary & Role Authorization
  // =========================================================================

  await t.test('Security: Ordinary employee is blocked from automation management (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/automations/config')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
  });

  await t.test('Security: Cross-tenant isolation blocks Marcus from Acme automation config', async () => {
    assert.notEqual(APEX_TENANT_ID, ACME_TENANT_ID);
    const res = await request(app)
      .get('/api/v1/automations/config')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
  });
});
