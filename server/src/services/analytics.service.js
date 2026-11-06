import { analyticsRepository } from '../repositories/analytics.repository.js';
import { ForbiddenError, TenantIsolationError } from '../utils/errors.js';
import auditService from './audit.service.js';

export class AnalyticsService {
  /**
   * Helper to check role permissions
   */
  isManagerOrAbove(role) {
    const r = String(role || '').toLowerCase();
    return ['owner', 'admin', 'manager', 'superadmin'].includes(r);
  }

  isOwnerOrAdmin(role) {
    const r = String(role || '').toLowerCase();
    return ['owner', 'admin', 'superadmin'].includes(r);
  }

  assertTenant(organizationId) {
    if (!organizationId) {
      throw new TenantIsolationError('organizationId is required for analytics telemetry');
    }
  }

  /**
   * Helper to escape CSV cell content
   */
  escapeCsv(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * 1. Organization Dashboard Analytics
   */
  async getOrganizationDashboard(organizationId, query = {}, userContext = {}) {
    this.assertTenant(organizationId);
    const { role } = userContext;

    const data = await analyticsRepository.getOrganizationDashboard(organizationId, query);

    // Permission guard: Employees cannot see confidential financial data
    if (!this.isManagerOrAbove(role)) {
      return {
        ...data,
        expenses: {
          totalClaims: data.expenses.totalClaims,
          approvedAmount: null,
          pendingAmount: null,
          rejectedAmount: null,
          byCategory: {}
        },
        invoices: {
          totalBilled: null,
          totalPaid: null,
          totalOutstanding: null,
          totalOverdue: null,
          byStatus: {}
        },
        trends: {
          monthlyRevenueVsExpense: []
        }
      };
    }

    return data;
  }

  /**
   * 2. Manager Dashboard Analytics
   */
  async getManagerDashboard(organizationId, query = {}, userContext = {}) {
    this.assertTenant(organizationId);
    const { role } = userContext;

    if (!this.isManagerOrAbove(role)) {
      throw new ForbiddenError('Manager, Admin, or Owner permissions required for manager analytics');
    }

    return analyticsRepository.getManagerDashboard(organizationId, query);
  }

  /**
   * 3. Super Admin Platform Analytics
   */
  async getSuperAdminDashboard(query = {}, userContext = {}) {
    const { isSuperAdmin, role } = userContext;
    if (!isSuperAdmin && role !== 'superadmin') {
      throw new ForbiddenError('Platform Super Admin privileges required to view cross-organization platform analytics');
    }

    return analyticsRepository.getSuperAdminDashboard(query);
  }

  /**
   * 4. Generate Exportable CSV Reports
   */
  async exportReport(organizationId, options = {}, userContext = {}) {
    const { type = 'executive', range = '30d' } = options;
    const { role, isSuperAdmin, userId } = userContext;

    let filename = '';
    const rows = [];

    if (type === 'platform') {
      if (!isSuperAdmin && role !== 'superadmin') {
        throw new ForbiddenError('Only Super Admins can export platform metrics');
      }

      const platformData = await analyticsRepository.getSuperAdminDashboard(options);
      filename = `opspilot-platform-analytics-${new Date().toISOString().split('T')[0]}.csv`;

      rows.push(['OpsPilot Platform Executive Analytics Report']);
      rows.push(['Generated At', new Date().toISOString()]);
      rows.push([]);
      rows.push(['Metric', 'Value']);
      rows.push(['Total Organizations', platformData.platform.totalOrganizations]);
      rows.push(['Active Organizations', platformData.platform.activeOrganizations]);
      rows.push(['Suspended Organizations', platformData.platform.suspendedOrganizations]);
      rows.push(['Total Users', platformData.platform.totalUsers]);
      rows.push(['Total Work Orders', platformData.platform.totalWorkOrders]);
      rows.push(['Total Platform Invoiced ($)', platformData.platform.totalPlatformVolume]);
      rows.push(['Enterprise Tier Subscriptions', platformData.platform.byTier.enterprise]);
      rows.push(['Growth Tier Subscriptions', platformData.platform.byTier.growth]);
      rows.push(['Starter Tier Subscriptions', platformData.platform.byTier.starter]);
      rows.push([]);
      rows.push(['Registered Organizations Activity']);
      rows.push(['Org Name', 'Slug', 'Tier', 'Status', 'User Count', 'Work Orders', 'Invoiced Amount ($)', 'Created At']);

      platformData.organizationActivity.forEach((org) => {
        rows.push([
          this.escapeCsv(org.name),
          this.escapeCsv(org.slug),
          this.escapeCsv(org.tier),
          this.escapeCsv(org.status),
          org.userCount,
          org.workOrderCount,
          org.invoicedAmount,
          org.createdAt
        ]);
      });
    } else if (type === 'manager') {
      this.assertTenant(organizationId);
      if (!this.isManagerOrAbove(role)) {
        throw new ForbiddenError('Manager permissions required to export manager workload report');
      }

      const managerData = await analyticsRepository.getManagerDashboard(organizationId, options);
      filename = `manager-workload-productivity-${new Date().toISOString().split('T')[0]}.csv`;

      rows.push(['OpsPilot Manager Productivity & Workload Report']);
      rows.push(['Generated At', new Date().toISOString()]);
      rows.push(['Total Tasks', managerData.productivity.totalTasks]);
      rows.push(['Completed Tasks', managerData.productivity.completedTasks]);
      rows.push(['In-Progress Tasks', managerData.productivity.inProgressTasks]);
      rows.push(['Completion Rate (%)', `${managerData.productivity.completionRate}%`]);
      rows.push([]);
      rows.push(['Team Workload Breakdown']);
      rows.push(['Employee Name', 'Email', 'Role', 'Department', 'Assigned Tasks', 'Active Tasks', 'Completed Tasks', 'Overdue Tasks', 'Workload Score', 'Status']);

      managerData.workload.forEach((w) => {
        rows.push([
          this.escapeCsv(w.name),
          this.escapeCsv(w.email),
          this.escapeCsv(w.role),
          this.escapeCsv(w.department),
          w.assignedTasks,
          w.activeTasks,
          w.completedTasks,
          w.overdueTasks,
          w.workloadScore,
          this.escapeCsv(w.status)
        ]);
      });

      rows.push([]);
      rows.push(['Overdue Tasks Log']);
      rows.push(['Task Code', 'Title', 'Priority', 'Assignee', 'Due Date', 'Days Overdue', 'Status']);
      managerData.overdueTasks.items.forEach((task) => {
        rows.push([
          this.escapeCsv(task.taskCode),
          this.escapeCsv(task.title),
          this.escapeCsv(task.priority),
          this.escapeCsv(task.assigneeName),
          task.dueDate,
          task.daysOverdue,
          this.escapeCsv(task.status)
        ]);
      });
    } else {
      // Default: Executive Organization Dashboard
      this.assertTenant(organizationId);
      if (!this.isManagerOrAbove(role)) {
        throw new ForbiddenError('Manager or Admin permissions required to export executive analytics');
      }

      const orgData = await analyticsRepository.getOrganizationDashboard(organizationId, options);
      filename = `organization-executive-analytics-${new Date().toISOString().split('T')[0]}.csv`;

      rows.push(['OpsPilot Organization Executive Analytics Report']);
      rows.push(['Generated At', new Date().toISOString()]);
      rows.push(['Time Window', range.toUpperCase()]);
      rows.push([]);
      rows.push(['Operational Metric', 'Value']);
      rows.push(['Total Employees', orgData.overview.totalEmployees]);
      rows.push(['Total Customers', orgData.overview.totalCustomers]);
      rows.push(['Active Projects', orgData.overview.activeProjects]);
      rows.push(['Completed Projects', orgData.overview.completedProjects]);
      rows.push(['Total Projects', orgData.overview.totalProjects]);
      rows.push(['Pending Tasks', orgData.overview.pendingTasks]);
      rows.push(['Completed Tasks', orgData.overview.completedTasks]);
      rows.push(['Overdue Tasks', orgData.overview.overdueTasks]);
      rows.push(['Service Request Volume', orgData.overview.serviceRequestVolume]);
      rows.push(['Total Work Orders', orgData.overview.totalWorkOrders]);
      rows.push(['Completed Work Orders', orgData.overview.completedWorkOrders]);
      rows.push(['Work Order Completion Rate (%)', `${orgData.overview.workOrderCompletionRate}%`]);
      rows.push([]);
      rows.push(['Financial Summary ($)', 'Amount']);
      rows.push(['Total Billed Invoices', orgData.invoices.totalBilled]);
      rows.push(['Total Paid Invoices', orgData.invoices.totalPaid]);
      rows.push(['Total Outstanding Invoices', orgData.invoices.totalOutstanding]);
      rows.push(['Total Overdue Invoices', orgData.invoices.totalOverdue]);
      rows.push(['Total Approved Expenses', orgData.expenses.approvedAmount]);
      rows.push(['Total Pending Expenses', orgData.expenses.pendingAmount]);
      rows.push(['Total Rejected Expenses', orgData.expenses.rejectedAmount]);
    }

    const csvContent = rows.map((r) => r.join(',')).join('\r\n');

    await auditService.recordSecurityEvent({
      organizationId: organizationId || 'platform',
      userId,
      action: 'ANALYTICS_REPORT_EXPORTED',
      entityType: 'ANALYTICS',
      entityId: `${type}_${range}`,
      metadata: { reportType: type, range }
    });

    return {
      filename,
      contentType: 'text/csv; charset=utf-8',
      data: csvContent
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
