import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * OpsPilot Read-Only Analytics Tools
 * Sandboxed, strictly read-only business data access layer for the AI assistant.
 * All functions enforce tenant isolation via organizationId.
 * NO dynamic SQL execution is allowed.
 */
export const aiToolsService = {
  /**
   * Tool 1: get_overdue_projects
   * Queries projects where due_date < now and status != 'completed' / 'archived'
   */
  async getOverdueProjects(organizationId) {
    const now = new Date();
    const nowIso = now.toISOString();

    if (env.isMockMode || !supabaseAdmin) {
      const projects = (mockDatabase.projects || []).filter(
        (p) =>
          p.organization_id === organizationId &&
          !p.deleted_at &&
          p.status !== 'completed' &&
          p.status !== 'archived'
      );

      // Find projects with past due date or target date
      const overdue = projects
        .filter((p) => {
          const rawDate = p.due_date || p.target_date || p.target_end_date || p.end_date;
          return rawDate && new Date(rawDate) < now;
        })
        .map((p) => {
          const rawDate = p.due_date || p.target_date || p.target_end_date || p.end_date;
          const due = new Date(rawDate);
          const daysOverdue = Math.max(1, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
          return {
            id: p.id,
            project_code: p.project_code || `PRJ-${p.id.slice(0, 4)}`,
            name: p.name,
            client: p.client || null,
            status: p.status,
            due_date: rawDate,
            target_end_date: rawDate,
            days_overdue: daysOverdue,
            progress: p.progress || 0,
            budget: p.budget || 0
          };
        })
        .sort((a, b) => b.days_overdue - a.days_overdue);

      return {
        total_overdue: overdue.length,
        as_of: nowIso,
        projects: overdue,
        overdue_projects: overdue
      };
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('id, project_code, name, client, status, due_date, progress, budget')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .neq('status', 'completed')
      .neq('status', 'archived')
      .lt('due_date', nowIso)
      .order('due_date', { ascending: true });

    if (error) {
      logger.error('Failed to query overdue projects for AI tool', error);
      throw error;
    }

    const formatted = (data || []).map((p) => {
      const due = new Date(p.due_date);
      const daysOverdue = Math.max(1, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
      return {
        ...p,
        target_end_date: p.due_date,
        days_overdue: daysOverdue
      };
    });

    return {
      total_overdue: formatted.length,
      as_of: nowIso,
      projects: formatted,
      overdue_projects: formatted
    };
  },

  /**
   * Tool 2: get_tasks_completed_this_month
   * Computes completed tasks in the current calendar month
   */
  async getTasksCompletedThisMonth(organizationId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (env.isMockMode || !supabaseAdmin) {
      const allTasks = (mockDatabase.tasks || []).filter(
        (t) => t.organization_id === organizationId && !t.deleted_at
      );

      const completed = allTasks.filter(
        (t) =>
          (t.column_name === 'done' ||
            t.column_name === 'completed' ||
            t.column === 'done' ||
            t.column === 'completed' ||
            t.status === 'completed') &&
          new Date(t.updated_at || t.created_at) >= new Date(startOfMonth)
      );

      const priorityCounts = { urgent: 0, high: 0, normal: 0, low: 0 };
      for (const t of completed) {
        const p = (t.priority || 'normal').toLowerCase();
        priorityCounts[p] = (priorityCounts[p] || 0) + 1;
      }

      const totalActive = allTasks.length;
      const rate = totalActive > 0 ? Math.round((completed.length / totalActive) * 100) : 0;

      return {
        month: monthName,
        completed_count: completed.length,
        total_completed_this_month: completed.length,
        total_tasks: totalActive,
        completion_rate_percentage: rate,
        priority_breakdown: priorityCounts,
        tasks: completed.slice(0, 10).map((t) => ({
          id: t.id,
          task_code: t.task_code || `TSK-${t.id.slice(0, 4)}`,
          title: t.title,
          priority: t.priority,
          completed_at: t.updated_at || t.created_at
        }))
      };
    }

    const { data: completed, count: completedCount, error } = await supabaseAdmin
      .from('tasks')
      .select('id, task_code, title, priority, updated_at', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .eq('column_name', 'done')
      .gte('updated_at', startOfMonth);

    if (error) {
      logger.error('Failed to query completed tasks for AI tool', error);
      throw error;
    }

    const { count: totalCount } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    const count = completedCount || 0;
    const total = totalCount || 0;
    const rate = total > 0 ? Math.round((count / total) * 100) : 0;

    const priorityCounts = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const t of completed || []) {
      const p = (t.priority || 'normal').toLowerCase();
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    }

    return {
      month: monthName,
      completed_count: count,
      total_completed_this_month: count,
      total_tasks: total,
      completion_rate_percentage: rate,
      priority_breakdown: priorityCounts,
      tasks: (completed || []).slice(0, 10)
    };
  },

  /**
   * Tool 3: get_low_stock_inventory
   * Identifies SKU items where quantity <= min_stock_threshold or given threshold
   */
  async getLowStockInventory(organizationId, threshold = 10) {
    if (env.isMockMode || !supabaseAdmin) {
      const allInventory = mockDatabase.inventory_items || mockDatabase.inventory || [];
      const items = allInventory.filter(
        (item) => item.organization_id === organizationId && !item.deleted_at
      );

      const lowStock = items
        .filter((item) => {
          const qty = item.in_stock ?? item.quantity ?? 0;
          const limit = item.reorder_level ?? item.min_stock_level ?? item.min_stock_threshold ?? threshold;
          return qty <= limit;
        })
        .map((item) => {
          const qty = item.in_stock ?? item.quantity ?? 0;
          const limit = item.reorder_level ?? item.min_stock_level ?? item.min_stock_threshold ?? threshold;
          return {
            id: item.id,
            sku: item.sku || `SKU-${item.id.slice(0, 4)}`,
            name: item.name,
            category: item.category || 'General',
            current_quantity: qty,
            quantity: qty,
            min_quantity: limit,
            min_stock_level: limit,
            deficit: Math.max(0, limit - qty),
            unit: item.unit || 'units'
          };
        })
        .sort((a, b) => b.deficit - a.deficit);

      return {
        total_low_stock_items: lowStock.length,
        total_critical_items: lowStock.length,
        threshold_used: threshold,
        items: lowStock,
        low_stock_items: lowStock
      };
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('id, sku, name, category, quantity, min_stock_level, unit')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to query inventory items for AI tool', error);
      throw error;
    }

    const lowStock = (data || [])
      .filter((item) => {
        const qty = item.quantity ?? 0;
        const limit = item.min_stock_level || threshold;
        return qty <= limit;
      })
      .map((item) => {
        const qty = item.quantity ?? 0;
        const limit = item.min_stock_level || threshold;
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          current_quantity: qty,
          quantity: qty,
          min_quantity: limit,
          min_stock_level: limit,
          deficit: Math.max(0, limit - qty),
          unit: item.unit || 'units'
        };
      })
      .sort((a, b) => b.deficit - a.deficit);

    return {
      total_low_stock_items: lowStock.length,
      total_critical_items: lowStock.length,
      threshold_used: threshold,
      items: lowStock,
      low_stock_items: lowStock
    };
  },

  /**
   * Tool 4: get_pending_service_requests
   * Retrieves active, unresolved customer service tickets
   */
  async getPendingServiceRequests(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const requests = (mockDatabase.service_requests || []).filter(
        (sr) =>
          sr.organization_id === organizationId &&
          !sr.deleted_at &&
          sr.status !== 'resolved' &&
          sr.status !== 'closed'
      );

      const urgentCount = requests.filter(
        (sr) =>
          sr.priority === 'urgent' ||
          sr.priority === 'critical' ||
          sr.priority === 'high' ||
          sr.urgency === 'urgent' ||
          sr.urgency === 'critical' ||
          sr.urgency === 'high'
      ).length;

      const formatted = requests.map((sr) => ({
        id: sr.id,
        ticket_code: sr.ticket_code || sr.request_code || `SR-${sr.id.slice(0, 4)}`,
        title: sr.title,
        customer_name: sr.customer_name || 'Customer',
        category: sr.category || sr.service_type || 'Maintenance',
        priority: sr.priority || sr.urgency || 'medium',
        status: sr.status,
        created_at: sr.created_at
      }));

      return {
        total_pending: formatted.length,
        urgent_count: urgentCount,
        requests: formatted,
        pending_requests: formatted
      };
    }

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select('id, ticket_code, title, customer_name, category, priority, status, created_at')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .neq('status', 'resolved')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to query service requests for AI tool', error);
      throw error;
    }

    const urgentCount = (data || []).filter(
      (sr) => sr.priority === 'urgent' || sr.priority === 'critical' || sr.priority === 'high'
    ).length;

    return {
      total_pending: (data || []).length,
      urgent_count: urgentCount,
      requests: data || [],
      pending_requests: data || []
    };
  },

  /**
   * Tool 5: get_monthly_performance_summary
   * Aggregates holistic operational metrics across projects, tasks, tickets, work orders & finances
   */
  async getMonthlyPerformanceSummary(organizationId) {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const [overduePrj, completedTasks, lowStock, pendingTickets] = await Promise.all([
      this.getOverdueProjects(organizationId),
      this.getTasksCompletedThisMonth(organizationId),
      this.getLowStockInventory(organizationId),
      this.getPendingServiceRequests(organizationId)
    ]);

    let workOrdersCompleted = 0;
    let workOrdersTotal = 0;
    let invoicedAmount = 0;
    let collectedAmount = 0;
    let activeMembers = 0;

    if (env.isMockMode || !supabaseAdmin) {
      const wos = (mockDatabase.work_orders || []).filter(
        (w) => w.organization_id === organizationId && !w.deleted_at
      );
      workOrdersTotal = wos.length;
      workOrdersCompleted = wos.filter((w) => w.status === 'completed').length;

      const invoices = (mockDatabase.invoices || []).filter(
        (inv) => inv.organization_id === organizationId && !inv.deleted_at
      );
      invoicedAmount = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      collectedAmount = invoices
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

      activeMembers = (mockDatabase.memberships || []).filter(
        (m) => m.organization_id === organizationId && m.status === 'active'
      ).length;
    } else {
      const [woRes, invRes, memRes] = await Promise.all([
        supabaseAdmin
          .from('work_orders')
          .select('status')
          .eq('organization_id', organizationId)
          .is('deleted_at', null),
        supabaseAdmin
          .from('invoices')
          .select('total, status')
          .eq('organization_id', organizationId)
          .is('deleted_at', null),
        supabaseAdmin
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active')
      ]);

      const wos = woRes.data || [];
      workOrdersTotal = wos.length;
      workOrdersCompleted = wos.filter((w) => w.status === 'completed').length;

      const invoices = invRes.data || [];
      invoicedAmount = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      collectedAmount = invoices
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

      activeMembers = memRes.count || 0;
    }

    const woRate =
      workOrdersTotal > 0 ? +((workOrdersCompleted / workOrdersTotal) * 100).toFixed(1) : 100;

    // Overall Health heuristic
    let health = 'EXCELLENT';
    if (overduePrj.total_overdue > 2 || pendingTickets.urgent_count > 3) {
      health = 'ATTENTION_REQUIRED';
    } else if (overduePrj.total_overdue > 0 || lowStock.total_low_stock_items > 0) {
      health = 'GOOD';
    }

    const activeProjectsCount = (mockDatabase.projects || []).filter(
      (p) => p.organization_id === organizationId && !p.deleted_at && p.status === 'in_progress'
    ).length;

    const approvedExpenses = (mockDatabase.expenses || []).filter(
      (e) => e.organization_id === organizationId && !e.deleted_at && (e.status === 'approved' || e.status === 'paid')
    ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      period: monthName,
      health_status: health,
      kpis: {
        tasks_completed_this_month: completedTasks.completed_count,
        active_projects: activeProjectsCount,
        invoiced_amount: +invoicedAmount.toFixed(2),
        approved_expenses: +approvedExpenses.toFixed(2),
        projects: {
          overdue: overduePrj.total_overdue,
          status: overduePrj.total_overdue === 0 ? 'ON_TRACK' : 'HAS_OVERDUE'
        },
        tasks: {
          completed_this_month: completedTasks.completed_count,
          completion_rate: `${completedTasks.completion_rate_percentage}%`
        },
        inventory: {
          low_stock_alerts: lowStock.total_low_stock_items
        },
        service_requests: {
          pending_count: pendingTickets.total_pending,
          urgent_count: pendingTickets.urgent_count
        },
        field_operations: {
          work_orders_completed: workOrdersCompleted,
          total_work_orders: workOrdersTotal,
          completion_rate: `${woRate}%`
        },
        financials: {
          total_invoiced: +invoicedAmount.toFixed(2),
          total_collected: +collectedAmount.toFixed(2),
          approved_expenses: +approvedExpenses.toFixed(2),
          currency: 'USD'
        },
        workforce: {
          active_seats: activeMembers
        }
      }
    };
  }
};

export default aiToolsService;
