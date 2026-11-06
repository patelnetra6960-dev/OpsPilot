import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { queueService } from './queue.service.js';
import { automationService } from '../services/automation.service.js';

export class WorkflowScheduler {
  constructor() {
    this.timer = null;
    this.pollIntervalMs = env.WORKFLOW_POLL_INTERVAL_MS || 60000;
    this.queue = null;
    this.isInitialized = false;
  }

  /**
   * Initialize queue and register job handlers
   */
  async initialize() {
    if (this.isInitialized) return;

    await queueService.initialize();
    this.queue = queueService.getQueue('automation', { concurrency: 5 });

    // Register worker processor
    queueService.registerWorker('automation', async (job) => {
      logger.info(`[WorkflowWorker] Processing job ${job.id} (${job.name}) for Org ${job.data?.organizationId || 'all'}`);

      switch (job.name) {
        case 'workflows.all':
          return automationService.runAllOrganizationAutomations(job.data.organizationId, job.data);
        case 'tasks.overdue_detection':
          return automationService.detectOverdueTasks(job.data);
        case 'tasks.upcoming_deadlines':
          return automationService.checkUpcomingDeadlines(job.data);
        case 'inventory.low_stock_alerts':
          return automationService.checkLowStockAlerts(job.data);
        case 'service_requests.escalation':
          return automationService.escalateServiceRequests(job.data);
        case 'expenses.approval_reminders':
          return automationService.sendExpenseApprovalReminders(job.data);
        case 'invoices.due_reminders':
          return automationService.sendInvoiceDueReminders(job.data);
        case 'analytics.scheduled_reports':
          return automationService.generateScheduledReports(job.data);
        default:
          throw new Error(`Unknown workflow job name: ${job.name}`);
      }
    });

    this.isInitialized = true;
    logger.info('[WorkflowScheduler] Initialized background worker and automation queue');
  }

  /**
   * Start recurring background polling loop
   */
  async start(customIntervalMs = null) {
    await this.initialize();

    if (customIntervalMs) {
      this.pollIntervalMs = customIntervalMs;
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    logger.info(`[WorkflowScheduler] Starting scheduler with interval ${this.pollIntervalMs}ms`);

    // Run first tick after short delay to let server start smoothly
    setTimeout(() => this.tick(), 1000);

    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
  }

  /**
   * Stop recurring scheduler
   */
  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('[WorkflowScheduler] Stopped scheduler');
  }

  /**
   * Scheduled tick: Enqueues workflow jobs for all active organizations
   */
  async tick() {
    try {
      let organizations = [];
      if (env.isMockMode || !supabaseAdmin) {
        organizations = (mockDatabase.organizations || []).filter((o) => o.is_active && !o.deleted_at);
      } else {
        const { data } = await supabaseAdmin
          .from('organizations')
          .select('id, name, settings, is_active')
          .eq('is_active', true)
          .is('deleted_at', null);
        organizations = data || [];
      }

      const now = new Date();
      const timeBucket = now.toISOString().slice(0, 16); // 1-minute bucket for deduplication

      for (const org of organizations) {
        // Enqueue background job (never blocks event loop or HTTP requests)
        const jobId = `auto_tick:${org.id}:${timeBucket}`;
        await this.queue.add(
          'workflows.all',
          { organizationId: org.id, scheduledTick: timeBucket },
          {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            deduplicateWindowMs: 55000 // Prevents re-enqueueing within 55s
          }
        );
      }
    } catch (err) {
      logger.error('[WorkflowScheduler] Error during scheduled tick:', err);
    }
  }

  /**
   * Trigger an immediate background workflow job for an organization
   * Asynchronous: Enqueues and returns job immediately!
   */
  async triggerWorkflow(organizationId, workflowName = 'workflows.all', payload = {}, opts = {}) {
    await this.initialize();

    const jobId = opts.jobId || `trigger:${organizationId}:${workflowName}:${Date.now()}`;
    const job = await this.queue.add(
      workflowName,
      { organizationId, ...payload, triggeredAt: new Date().toISOString() },
      {
        jobId,
        attempts: opts.attempts || 3,
        backoff: opts.backoff || { type: 'exponential', delay: 1000 },
        delay: opts.delay || 0,
        ...opts
      }
    );

    logger.info(`[WorkflowScheduler] Enqueued background workflow "${workflowName}" for Org ${organizationId} (Job ID: ${job.id})`);
    return job;
  }
}

export const workflowScheduler = new WorkflowScheduler();
export default workflowScheduler;
