import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { deduplicationService } from './deduplication.service.js';
import { notificationService } from './notification.service.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';

export class AutomationService {
  /**
   * Helper: Get organization timezone
   */
  getOrganizationTimezone(organization) {
    return organization?.settings?.timezone || 'UTC';
  }

  /**
   * Helper: Formats current date string (YYYY-MM-DD) in organization's timezone
   */
  getOrgLocalDate(timezone = 'UTC', date = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Helper: Get manager/admin user IDs for an organization
   */
  async getOrgManagerUserIds(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const members = (mockDatabase.memberships || []).filter(
        (m) => m.organization_id === organizationId && ['owner', 'admin', 'manager'].includes(m.role)
      );
      return members.map((m) => m.user_id);
    }

    const { data } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('role', ['owner', 'admin', 'manager']);

    return (data || []).map((m) => m.user_id);
  }

  /**
   * Helper: Fetch organization by ID
   */
  async getOrganization(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.organizations || []).find((o) => o.id === organizationId) || null;
    }
    const { data } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    return data;
  }

  // =========================================================================
  // 1. Overdue Task Detection
  // =========================================================================
  async detectOverdueTasks(params = {}) {
    const { organizationId, now = new Date() } = params;
    const nowIso = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    const org = await this.getOrganization(organizationId);
    const timezone = this.getOrganizationTimezone(org);
    const localDate = this.getOrgLocalDate(timezone, new Date(nowIso));

    let tasks = [];
    if (env.isMockMode || !supabaseAdmin) {
      tasks = (mockDatabase.tasks || []).filter(
        (t) =>
          t.organization_id === organizationId &&
          !t.deleted_at &&
          !['done', 'completed', 'cancelled'].includes(t.status) &&
          t.due_date &&
          new Date(t.due_date) < new Date(nowIso)
      );
    } else {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .not('status', 'in', '("done","completed","cancelled")')
        .lt('due_date', nowIso);
      tasks = data || [];
    }

    let remindersSent = 0;
    const managerUserIds = await this.getOrgManagerUserIds(organizationId);

    for (const task of tasks) {
      // Transition task status to overdue if not already
      if (task.status !== 'overdue') {
        task.status = 'overdue';
        task.updated_at = nowIso;
        if (!env.isMockMode && supabaseAdmin) {
          await supabaseAdmin
            .from('tasks')
            .update({ status: 'overdue', updated_at: nowIso })
            .eq('id', task.id);
        }
      }

      // Check deduplication: alert at most once per day per overdue task
      const dedupKey = `overdue_task:${task.id}:${localDate}`;
      if (deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000, { taskId: task.id, title: task.title })) {
        continue;
      }

      // Safe notification delivery to assignee
      const recipients = new Set();
      if (task.assignee_id) {
        recipients.add(task.assignee_id);
      }
      // Also notify managers
      managerUserIds.forEach((uid) => recipients.add(uid));

      for (const userId of recipients) {
        await notificationService.createNotification({
          organizationId,
          userId,
          title: `Overdue Task Alert: ${task.title}`,
          message: `Task "${task.title}" was due on ${task.due_date.split('T')[0]} and is now overdue.`,
          type: 'warning',
          actionUrl: `/tasks?id=${task.id}`,
          data: { taskId: task.id, dueDate: task.due_date, eventId: `overdue-${task.id}-${localDate}` }
        });
      }
      remindersSent++;
    }

    logger.info(`[Automation:OverdueTasks] Org ${organizationId}: Evaluated ${tasks.length} overdue tasks, dispatched ${remindersSent} reminders`);
    return {
      workflow: 'tasks.overdue_detection',
      organizationId,
      checked: tasks.length,
      overdueFound: tasks.length,
      remindersSent
    };
  }

  // =========================================================================
  // 2. Upcoming Deadline Reminders
  // =========================================================================
  async checkUpcomingDeadlines(params = {}) {
    const { organizationId, now = new Date(), windowHours = 24 } = params;
    const nowDate = now instanceof Date ? now : new Date(now);
    const windowEnd = new Date(nowDate.getTime() + windowHours * 60 * 60 * 1000);
    const org = await this.getOrganization(organizationId);
    const timezone = this.getOrganizationTimezone(org);
    const localDate = this.getOrgLocalDate(timezone, nowDate);

    let tasks = [];
    if (env.isMockMode || !supabaseAdmin) {
      tasks = (mockDatabase.tasks || []).filter((t) => {
        if (t.organization_id !== organizationId || t.deleted_at) return false;
        if (['done', 'completed', 'cancelled'].includes(t.status)) return false;
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        return due >= nowDate && due <= windowEnd;
      });
    } else {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .not('status', 'in', '("done","completed","cancelled")')
        .gte('due_date', nowDate.toISOString())
        .lte('due_date', windowEnd.toISOString());
      tasks = data || [];
    }

    let remindersSent = 0;
    for (const task of tasks) {
      const dedupKey = `upcoming_deadline:${task.id}:${localDate}`;
      if (deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000, { taskId: task.id })) {
        continue;
      }

      if (task.assignee_id) {
        const hoursRemaining = Math.max(1, Math.round((new Date(task.due_date).getTime() - nowDate.getTime()) / (1000 * 60 * 60)));
        await notificationService.createNotification({
          organizationId,
          userId: task.assignee_id,
          title: `Upcoming Deadline: ${task.title}`,
          message: `Task "${task.title}" is due in approximately ${hoursRemaining} hour(s) (${task.due_date.split('T')[0]}).`,
          type: 'info',
          actionUrl: `/tasks?id=${task.id}`,
          data: { taskId: task.id, hoursRemaining }
        });
        remindersSent++;
      }
    }

    logger.info(`[Automation:Deadlines] Org ${organizationId}: ${tasks.length} upcoming tasks, ${remindersSent} reminders sent`);
    return {
      workflow: 'tasks.upcoming_deadlines',
      organizationId,
      checked: tasks.length,
      upcomingFound: tasks.length,
      remindersSent
    };
  }

  // =========================================================================
  // 3. Low-Stock Notifications
  // =========================================================================
  async checkLowStockAlerts(params = {}) {
    const { organizationId, now = new Date() } = params;
    const org = await this.getOrganization(organizationId);
    const timezone = this.getOrganizationTimezone(org);
    const localDate = this.getOrgLocalDate(timezone, new Date(now));

    let items = [];
    if (env.isMockMode || !supabaseAdmin) {
      items = (mockDatabase.inventory_items || []).filter(
        (i) =>
          i.organization_id === organizationId &&
          !i.deleted_at &&
          Number(i.quantity) <= Number(i.min_stock_threshold || i.reorder_threshold || 10)
      );
    } else {
      const { data } = await supabaseAdmin
        .from('inventory_items')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      items = (data || []).filter(
        (i) => Number(i.quantity) <= Number(i.min_stock_threshold || i.reorder_threshold || 10)
      );
    }

    let alertsSent = 0;
    const managerUserIds = await this.getOrgManagerUserIds(organizationId);

    for (const item of items) {
      const dedupKey = `low_stock:${item.id}:${localDate}`;
      if (deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000, { itemId: item.id })) {
        continue;
      }

      for (const userId of managerUserIds) {
        await notificationService.createNotification({
          organizationId,
          userId,
          title: `Low Stock Alert: ${item.name}`,
          message: `Item "${item.name}" (SKU: ${item.sku}) is below threshold with only ${item.quantity} units left (Min threshold: ${item.min_stock_threshold || 10}).`,
          type: 'alert',
          actionUrl: `/inventory?sku=${encodeURIComponent(item.sku)}`,
          data: { itemId: item.id, sku: item.sku, quantity: item.quantity }
        });
      }
      alertsSent++;
    }

    logger.info(`[Automation:LowStock] Org ${organizationId}: ${items.length} low-stock items detected, ${alertsSent} alerts dispatched`);
    return {
      workflow: 'inventory.low_stock_alerts',
      organizationId,
      checked: items.length,
      lowStockFound: items.length,
      alertsSent
    };
  }

  // =========================================================================
  // 4. Service Request Escalation
  // =========================================================================
  async escalateServiceRequests(params = {}) {
    const { organizationId, now = new Date() } = params;
    const nowDate = now instanceof Date ? now : new Date(now);

    const SLA_THRESHOLDS_HOURS = {
      urgent: 12,
      high: 24,
      medium: 48,
      low: 72
    };

    let requests = [];
    if (env.isMockMode || !supabaseAdmin) {
      requests = (mockDatabase.serviceRequests || []).filter(
        (sr) =>
          sr.organization_id === organizationId &&
          !sr.deleted_at &&
          ['submitted', 'pending', 'under_review'].includes(sr.status)
      );
    } else {
      const { data } = await supabaseAdmin
        .from('service_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .in('status', ['submitted', 'pending', 'under_review']);
      requests = data || [];
    }

    let escalatedCount = 0;
    const managerUserIds = await this.getOrgManagerUserIds(organizationId);

    for (const req of requests) {
      const slaHours = SLA_THRESHOLDS_HOURS[req.priority] || 48;
      const createdDate = new Date(req.created_at);
      const ageHours = (nowDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

      if (ageHours > slaHours && !req.is_escalated) {
        // Escalate priority tier
        const previousPriority = req.priority;
        let newPriority = 'urgent';
        if (previousPriority === 'low') newPriority = 'medium';
        else if (previousPriority === 'medium') newPriority = 'high';
        else newPriority = 'urgent';

        req.is_escalated = true;
        req.priority = newPriority;
        req.escalated_at = nowDate.toISOString();
        req.updated_at = nowDate.toISOString();

        if (!env.isMockMode && supabaseAdmin) {
          await supabaseAdmin
            .from('service_requests')
            .update({
              is_escalated: true,
              priority: newPriority,
              escalated_at: req.escalated_at,
              updated_at: req.updated_at
            })
            .eq('id', req.id);
        }

        const dedupKey = `sr_escalation:${req.id}:${newPriority}`;
        if (!deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000)) {
          for (const userId of managerUserIds) {
            await notificationService.createNotification({
              organizationId,
              userId,
              title: `Service Request Escalated: #${req.ticket_number || req.id.slice(0, 8)}`,
              message: `Service request "${req.title || req.description?.slice(0, 40)}" breached ${slaHours}h SLA and was escalated from ${previousPriority} to ${newPriority}.`,
              type: 'alert',
              actionUrl: `/services?id=${req.id}`,
              data: { requestId: req.id, previousPriority, newPriority, ageHours: Math.round(ageHours) }
            });
          }
        }
        escalatedCount++;
      }
    }

    logger.info(`[Automation:Escalation] Org ${organizationId}: ${escalatedCount} requests escalated`);
    return {
      workflow: 'service_requests.escalation',
      organizationId,
      checked: requests.length,
      escalatedCount
    };
  }

  // =========================================================================
  // 5. Expense Approval Reminders
  // =========================================================================
  async sendExpenseApprovalReminders(params = {}) {
    const { organizationId, now = new Date(), pendingAgeHours = 48 } = params;
    const nowDate = now instanceof Date ? now : new Date(now);
    const org = await this.getOrganization(organizationId);
    const timezone = this.getOrganizationTimezone(org);
    const localDate = this.getOrgLocalDate(timezone, nowDate);

    let expenses = [];
    if (env.isMockMode || !supabaseAdmin) {
      expenses = (mockDatabase.expenses || []).filter(
        (e) =>
          e.organization_id === organizationId &&
          !e.deleted_at &&
          e.status === 'pending'
      );
    } else {
      const { data } = await supabaseAdmin
        .from('expenses')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .eq('status', 'pending');
      expenses = data || [];
    }

    let remindersSent = 0;
    const managerUserIds = await this.getOrgManagerUserIds(organizationId);

    for (const expense of expenses) {
      const submittedDate = new Date(expense.submitted_at || expense.created_at);
      const ageHours = (nowDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);

      if (ageHours >= pendingAgeHours) {
        const dedupKey = `expense_approval:${expense.id}:${localDate}`;
        if (deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000)) {
          continue;
        }

        for (const userId of managerUserIds) {
          await notificationService.createNotification({
            organizationId,
            userId,
            title: `Pending Expense Approval Reminder`,
            message: `Expense claim of $${expense.amount} (${expense.category}) submitted by ${expense.employee_name || 'Staff'} has been pending review for ${Math.round(ageHours / 24)} day(s).`,
            type: 'warning',
            actionUrl: `/expenses?id=${expense.id}`,
            data: { expenseId: expense.id, amount: expense.amount, ageHours: Math.round(ageHours) }
          });
        }
        remindersSent++;
      }
    }

    logger.info(`[Automation:ExpenseApprovals] Org ${organizationId}: ${remindersSent} approval reminders sent`);
    return {
      workflow: 'expenses.approval_reminders',
      organizationId,
      checked: expenses.length,
      remindersSent
    };
  }

  // =========================================================================
  // 6. Invoice Due Reminders
  // =========================================================================
  async sendInvoiceDueReminders(params = {}) {
    const { organizationId, now = new Date(), upcomingDays = 3 } = params;
    const nowDate = now instanceof Date ? now : new Date(now);
    const org = await this.getOrganization(organizationId);
    const timezone = this.getOrganizationTimezone(org);
    const localDate = this.getOrgLocalDate(timezone, nowDate);

    let invoices = [];
    if (env.isMockMode || !supabaseAdmin) {
      invoices = (mockDatabase.invoices || []).filter(
        (i) =>
          i.organization_id === organizationId &&
          !i.deleted_at &&
          !['paid', 'void', 'draft'].includes(i.status)
      );
    } else {
      const { data } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .not('status', 'in', '("paid","void","draft")');
      invoices = data || [];
    }

    let overdueCount = 0;
    let upcomingCount = 0;
    let remindersSent = 0;
    const managerUserIds = await this.getOrgManagerUserIds(organizationId);

    for (const invoice of invoices) {
      if (!invoice.due_date) continue;
      const dueDate = new Date(invoice.due_date);

      if (dueDate < nowDate) {
        // Invoice is overdue
        overdueCount++;
        if (invoice.status !== 'overdue') {
          invoice.status = 'overdue';
          invoice.updated_at = nowDate.toISOString();
          if (!env.isMockMode && supabaseAdmin) {
            await supabaseAdmin
              .from('invoices')
              .update({ status: 'overdue', updated_at: nowDate.toISOString() })
              .eq('id', invoice.id);
          }
        }

        const dedupKey = `invoice_overdue:${invoice.id}:${localDate}`;
        if (!deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000)) {
          const recipients = new Set(managerUserIds);
          if (invoice.customer_id) recipients.add(invoice.customer_id);

          for (const userId of recipients) {
            await notificationService.createNotification({
              organizationId,
              userId,
              title: `Overdue Invoice: #${invoice.invoice_number || invoice.id.slice(0, 8)}`,
              message: `Invoice #${invoice.invoice_number || invoice.id.slice(0, 8)} for $${invoice.total_amount ?? invoice.total ?? 0} was due on ${invoice.due_date.split('T')[0]} and is now overdue.`,
              type: 'warning',
              actionUrl: `/invoices?id=${invoice.id}`,
              data: { invoiceId: invoice.id, dueDate: invoice.due_date }
            });
          }
          remindersSent++;
        }
      } else {
        // Check if approaching due date within upcomingDays
        const daysRemaining = (dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysRemaining <= upcomingDays) {
          upcomingCount++;
          const dedupKey = `invoice_upcoming:${invoice.id}:${localDate}`;
          if (!deduplicationService.isDuplicate(dedupKey, 24 * 60 * 60 * 1000)) {
            const recipients = new Set(managerUserIds);
            if (invoice.customer_id) recipients.add(invoice.customer_id);

            for (const userId of recipients) {
              await notificationService.createNotification({
                organizationId,
                userId,
                title: `Upcoming Invoice Due: #${invoice.invoice_number || invoice.id.slice(0, 8)}`,
                message: `Invoice #${invoice.invoice_number || invoice.id.slice(0, 8)} for $${invoice.total_amount ?? invoice.total ?? 0} is due on ${invoice.due_date.split('T')[0]} (in ${Math.ceil(daysRemaining)} days).`,
                type: 'info',
                actionUrl: `/invoices?id=${invoice.id}`,
                data: { invoiceId: invoice.id, daysRemaining: Math.ceil(daysRemaining) }
              });
            }
            remindersSent++;
          }
        }
      }
    }

    logger.info(`[Automation:Invoices] Org ${organizationId}: ${overdueCount} overdue, ${upcomingCount} upcoming, ${remindersSent} notices sent`);
    return {
      workflow: 'invoices.due_reminders',
      organizationId,
      checked: invoices.length,
      overdueCount,
      upcomingCount,
      remindersSent
    };
  }

  // =========================================================================
  // 7. Scheduled Reports
  // =========================================================================
  async generateScheduledReports(params = {}) {
    const { organizationId, now = new Date(), reportType = 'daily' } = params;
    const nowDate = now instanceof Date ? now : new Date(now);
    const org = await this.getOrganization(organizationId);
    const timezone = this.getOrganizationTimezone(org);
    const localDate = this.getOrgLocalDate(timezone, nowDate);

    const dedupKey = `scheduled_report:${organizationId}:${reportType}:${localDate}`;
    if (deduplicationService.isDuplicate(dedupKey, 12 * 60 * 60 * 1000)) {
      logger.info(`[Automation:ScheduledReport] Org ${organizationId}: ${reportType} report already generated for ${localDate}`);
      return {
        workflow: 'analytics.scheduled_reports',
        organizationId,
        reportType,
        status: 'already_generated'
      };
    }

    // Run executive organization analytics
    const dashboardData = await analyticsRepository.getOrganizationDashboard(organizationId, { range: '7d' });
    const managerUserIds = await this.getOrgManagerUserIds(organizationId);

    const reportSummary = {
      organizationName: org?.name || 'Organization',
      generatedAt: nowDate.toISOString(),
      timezone,
      localDate,
      activeProjects: dashboardData.overview.activeProjects,
      pendingTasks: dashboardData.overview.pendingTasks,
      overdueTasks: dashboardData.overview.overdueTasks,
      workOrderCompletionRate: `${dashboardData.overview.workOrderCompletionRate}%`,
      totalInvoiced: dashboardData.invoices.totalBilled,
      totalExpenses: dashboardData.expenses.approvedAmount
    };

    for (const userId of managerUserIds) {
      await notificationService.createNotification({
        organizationId,
        userId,
        title: `Scheduled ${reportType === 'daily' ? 'Daily' : 'Weekly'} Executive Report`,
        message: `Report for ${reportSummary.organizationName} (${localDate}): ${reportSummary.activeProjects} active projects, ${reportSummary.pendingTasks} pending tasks (${reportSummary.overdueTasks} overdue), work order completion rate ${reportSummary.workOrderCompletionRate}.`,
        type: 'info',
        actionUrl: '/analytics',
        data: { reportType, summary: reportSummary }
      });
    }

    logger.info(`[Automation:ScheduledReport] Org ${organizationId}: Generated and delivered ${reportType} report for ${localDate}`);
    return {
      workflow: 'analytics.scheduled_reports',
      organizationId,
      reportType,
      status: 'completed',
      summary: reportSummary
    };
  }

  // =========================================================================
  // Comprehensive Runner: Run all 7 Workflows for an Organization
  // =========================================================================
  async runAllOrganizationAutomations(organizationId, options = {}) {
    const org = await this.getOrganization(organizationId);
    if (!org || !org.is_active) {
      return { organizationId, status: 'skipped', reason: 'Organization inactive or not found' };
    }

    const config = org.settings?.automation || {
      overdueTasks: true,
      upcomingDeadlines: true,
      lowStockAlerts: true,
      serviceRequestEscalation: true,
      expenseApprovalReminders: true,
      invoiceDueReminders: true,
      scheduledReports: true
    };

    const results = {};
    const now = options.now || new Date();

    if (config.overdueTasks !== false) {
      results.overdueTasks = await this.detectOverdueTasks({ organizationId, now });
    }
    if (config.upcomingDeadlines !== false) {
      results.upcomingDeadlines = await this.checkUpcomingDeadlines({ organizationId, now });
    }
    if (config.lowStockAlerts !== false) {
      results.lowStockAlerts = await this.checkLowStockAlerts({ organizationId, now });
    }
    if (config.serviceRequestEscalation !== false) {
      results.serviceRequestEscalation = await this.escalateServiceRequests({ organizationId, now });
    }
    if (config.expenseApprovalReminders !== false) {
      results.expenseApprovalReminders = await this.sendExpenseApprovalReminders({ organizationId, now });
    }
    if (config.invoiceDueReminders !== false) {
      results.invoiceDueReminders = await this.sendInvoiceDueReminders({ organizationId, now });
    }
    if (config.scheduledReports !== false) {
      results.scheduledReports = await this.generateScheduledReports({ organizationId, now, reportType: options.reportType || 'daily' });
    }

    // Record audit event
    const auditRecord = {
      organization_id: organizationId,
      user_id: options.triggeredBy || null,
      action: 'WORKFLOW_AUTOMATION_EXECUTED',
      entity_type: 'AUTOMATION',
      entity_id: `auto_${organizationId}`,
      new_values: results,
      created_at: new Date().toISOString()
    };

    if (env.isMockMode || !supabaseAdmin) {
      mockDatabase.auditLogs = mockDatabase.auditLogs || [];
      mockDatabase.auditLogs.push(auditRecord);
    } else {
      await supabaseAdmin.from('audit_logs').insert([auditRecord]);
    }

    return {
      organizationId,
      status: 'completed',
      executedAt: new Date().toISOString(),
      results
    };
  }
}

export const automationService = new AutomationService();
export default automationService;
