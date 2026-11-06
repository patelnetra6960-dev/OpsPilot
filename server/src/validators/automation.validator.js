import { z } from 'zod';

export const updateAutomationConfigSchema = z.object({
  overdueTasks: z.boolean().optional(),
  upcomingDeadlines: z.boolean().optional(),
  lowStockAlerts: z.boolean().optional(),
  serviceRequestEscalation: z.boolean().optional(),
  expenseApprovalReminders: z.boolean().optional(),
  invoiceDueReminders: z.boolean().optional(),
  scheduledReports: z.boolean().optional(),
  timezone: z.string().optional(),
  slaUrgentHours: z.coerce.number().min(1).max(168).optional(),
  slaHighHours: z.coerce.number().min(1).max(168).optional(),
  slaMediumHours: z.coerce.number().min(1).max(168).optional(),
  slaLowHours: z.coerce.number().min(1).max(168).optional(),
  lowStockThreshold: z.coerce.number().min(1).max(1000).optional(),
  upcomingDeadlineHours: z.coerce.number().min(1).max(168).optional(),
  expensePendingDays: z.coerce.number().min(1).max(30).optional(),
  invoiceDueDays: z.coerce.number().min(1).max(30).optional()
});

export const triggerWorkflowSchema = z.object({
  workflow: z
    .enum([
      'workflows.all',
      'tasks.overdue_detection',
      'tasks.upcoming_deadlines',
      'inventory.low_stock_alerts',
      'service_requests.escalation',
      'expenses.approval_reminders',
      'invoices.due_reminders',
      'analytics.scheduled_reports'
    ])
    .default('workflows.all'),
  options: z.record(z.any()).optional().default({})
});
