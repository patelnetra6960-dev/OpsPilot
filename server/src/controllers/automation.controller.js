import { automationService } from '../services/automation.service.js';
import { workflowScheduler } from '../jobs/workflow.scheduler.js';
import { queueService } from '../jobs/queue.service.js';
import { deduplicationService } from '../services/deduplication.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export class AutomationController {
  /**
   * Helper: extract tenant context
   */
  getTenantContext(req) {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId || req.user?.organization_id;
    return tenantId;
  }

  /**
   * GET /api/v1/automations/config
   * Retrieve automation settings for the current organization
   */
  async getAutomationConfig(req, res) {
    const tenantId = this.getTenantContext(req);
    const org = await automationService.getOrganization(tenantId);
    if (!org) {
      throw new NotFoundError(`Organization ${tenantId} not found`);
    }

    const defaultAutomation = {
      overdueTasks: true,
      upcomingDeadlines: true,
      lowStockAlerts: true,
      serviceRequestEscalation: true,
      expenseApprovalReminders: true,
      invoiceDueReminders: true,
      scheduledReports: true,
      slaUrgentHours: 12,
      slaHighHours: 24,
      slaMediumHours: 48,
      slaLowHours: 72,
      lowStockThreshold: 10,
      upcomingDeadlineHours: 24,
      expensePendingDays: 2,
      invoiceDueDays: 3
    };

    const automationConfig = {
      ...defaultAutomation,
      ...(org.settings?.automation || {})
    };

    return res.status(200).json({
      success: true,
      data: {
        organizationId: org.id,
        organizationName: org.name,
        timezone: org.settings?.timezone || 'UTC',
        schedulerIntervalMs: workflowScheduler.pollIntervalMs,
        automation: automationConfig
      }
    });
  }

  /**
   * PUT /api/v1/automations/config
   * Update automation settings and rules
   */
  async updateAutomationConfig(req, res) {
    const tenantId = this.getTenantContext(req);
    const updates = req.body;
    const org = await automationService.getOrganization(tenantId);
    if (!org) {
      throw new NotFoundError(`Organization ${tenantId} not found`);
    }

    const currentSettings = org.settings || {};
    const currentAutomation = currentSettings.automation || {};

    const updatedAutomation = {
      ...currentAutomation,
      ...updates
    };

    if (updates.timezone) {
      currentSettings.timezone = updates.timezone;
    }
    currentSettings.automation = updatedAutomation;

    if (env.isMockMode || !supabaseAdmin) {
      org.settings = currentSettings;
      org.updated_at = new Date().toISOString();
    } else {
      await supabaseAdmin
        .from('organizations')
        .update({ settings: currentSettings, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
    }

    logger.info(`[AutomationController] Updated automation config for Org ${tenantId}`);

    return res.status(200).json({
      success: true,
      message: 'Automation configuration updated successfully',
      data: {
        organizationId: tenantId,
        timezone: currentSettings.timezone,
        automation: updatedAutomation
      }
    });
  }

  /**
   * POST /api/v1/automations/trigger
   * Trigger immediate background job execution (Asynchronous: HTTP 202)
   */
  async triggerWorkflow(req, res) {
    const tenantId = this.getTenantContext(req);
    const { workflow = 'workflows.all', options = {} } = req.body;

    const job = await workflowScheduler.triggerWorkflow(
      tenantId,
      workflow,
      {
        ...options,
        triggeredBy: req.user?.id || req.userId
      }
    );

    // Return 202 Accepted immediately without waiting for long-running batch job
    return res.status(202).json({
      success: true,
      message: 'Workflow job queued for background execution',
      data: {
        jobId: job.id,
        workflow: job.name,
        status: job.status,
        enqueuedAt: job.createdAt
      }
    });
  }

  /**
   * GET /api/v1/automations/queue/metrics
   * Get queue health metrics
   */
  async getQueueMetrics(req, res) {
    const metrics = await queueService.getMetrics('automation');
    return res.status(200).json({
      success: true,
      data: {
        queue: 'automation',
        driver: queueService.driverType,
        schedulerActive: Boolean(workflowScheduler.timer),
        pollIntervalMs: workflowScheduler.pollIntervalMs,
        metrics
      }
    });
  }

  /**
   * GET /api/v1/automations/queue/jobs
   * Get job history for current organization
   */
  async getJobHistory(req, res) {
    const tenantId = this.getTenantContext(req);
    const queue = queueService.getQueue('automation');
    const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 0, 50);

    // Tenant boundary: Only return jobs belonging to this tenant (or all if superadmin)
    const isSuperAdmin = req.user?.is_superadmin || req.isSuperAdmin;
    const tenantJobs = isSuperAdmin
      ? jobs
      : jobs.filter((j) => j.data?.organizationId === tenantId);

    return res.status(200).json({
      success: true,
      data: {
        total: tenantJobs.length,
        jobs: tenantJobs.map((j) => j.toJSON())
      }
    });
  }

  /**
   * POST /api/v1/automations/queue/jobs/:id/retry
   * Retry a failed job
   */
  async retryFailedJob(req, res) {
    const { id } = req.params;
    const queue = queueService.getQueue('automation');
    const job = await queue.getJob(id);

    if (!job) {
      throw new NotFoundError(`Job ${id} not found in queue`);
    }

    const tenantId = this.getTenantContext(req);
    const isSuperAdmin = req.user?.is_superadmin || req.isSuperAdmin;
    if (!isSuperAdmin && job.data?.organizationId !== tenantId) {
      throw new NotFoundError(`Job ${id} not found for this organization`);
    }

    const retriedJob = await queue.retryJob(id);

    return res.status(200).json({
      success: true,
      message: `Job ${id} re-enqueued for execution`,
      data: retriedJob.toJSON()
    });
  }

  /**
   * GET /api/v1/automations/deduplication
   * View recent deduplication records
   */
  async getRecentDeduplication(req, res) {
    const records = deduplicationService.getRecentRecords(50);
    return res.status(200).json({
      success: true,
      data: records
    });
  }
}

export const automationController = new AutomationController();
export default automationController;
