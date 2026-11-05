import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import {
  ForbiddenError,
  ValidationError,
  TenantIsolationError
} from '../utils/errors.js';
import auditService from './audit.service.js';

export class SearchService {
  /**
   * Helper to determine user role permissions
   */
  getPermissions(role) {
    const normalized = String(role || '').toLowerCase();
    const isSuperAdmin = normalized === 'superadmin';
    const isOwnerOrAdmin = ['owner', 'admin'].includes(normalized);
    const isManager = normalized === 'manager' || isOwnerOrAdmin || isSuperAdmin;
    const isCustomer = normalized === 'customer';
    const isEmployee = normalized === 'employee' || (!isCustomer && !isManager);

    return {
      isSuperAdmin,
      isOwnerOrAdmin,
      isManager,
      isCustomer,
      isEmployee
    };
  }

  /**
   * Resolve customer ID for user if authenticated as a customer
   */
  async getCustomerForUser(userId, organizationId) {
    if (!userId || !organizationId) return null;

    if (env.isMockMode || !supabaseAdmin) {
      const customers = mockDatabase.customers || [];
      return (
        customers.find(
          (c) =>
            c.organization_id === organizationId &&
            c.user_id === userId &&
            !c.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) return null;
    return data || null;
  }

  async fetchWorkforce(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.workforce || []).filter(
        (w) => w.organization_id === organizationId && !w.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  async fetchCustomers(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.customers || []).filter(
        (c) => c.organization_id === organizationId && !c.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  async fetchProjects(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.projects || []).filter(
        (p) => p.organization_id === organizationId && !p.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  async fetchTasks(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.tasks || []).filter(
        (t) => t.organization_id === organizationId && !t.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  async fetchServiceRequests(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.serviceRequests || []).filter(
        (sr) => sr.organization_id === organizationId && !sr.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  async fetchInventory(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.inventory_items || []).filter(
        (inv) => inv.organization_id === organizationId && !inv.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  async fetchInvoices(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.invoices || []).filter(
        (inv) => inv.organization_id === organizationId && !inv.deleted_at
      );
    }
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return data || [];
  }

  /**
   * Safe CSV cell formatter with Formula Injection / CSV Injection protection
   */
  formatCsvCell(val) {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();

    // Prevent CSV formula injection: escape =, +, -, @ prefixes
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }

    // Escape double quotes and quote if comma, newline or quotes present
    if (/[",\r\n]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Convert array of objects to CSV string
   */
  buildCsv(rows, columns) {
    const headerRow = columns.map((col) => this.formatCsvCell(col.header)).join(',');
    const bodyRows = rows.map((row) =>
      columns.map((col) => this.formatCsvCell(col.accessor(row))).join(',')
    );

    return [headerRow, ...bodyRows].join('\r\n');
  }

  /**
   * Global multi-entity search with role boundaries, multi-field filters, and pagination
   */
  async searchEntities(organizationId, queryParams = {}, userContext = {}) {
    if (!organizationId) {
      throw new TenantIsolationError('organizationId is required for global search');
    }

    const { role, userId } = userContext;
    const perms = this.getPermissions(role);

    const term = (queryParams.q || queryParams.query || '').trim().toLowerCase();
    const type = queryParams.type || 'all';
    const statusFilter = (queryParams.status || '').toLowerCase();
    const priorityFilter = (queryParams.priority || '').toLowerCase();
    const fromDate = queryParams.from_date;
    const toDate = queryParams.to_date;
    const page = Math.max(1, Number(queryParams.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(queryParams.limit) || 20));

    // Resolve customer identity if user is a customer
    let customerRecord = null;
    if (perms.isCustomer) {
      if (userContext.customerId) {
        customerRecord = { id: userContext.customerId };
      } else {
        customerRecord = await this.getCustomerForUser(userId, organizationId);
      }
      if (!customerRecord) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }
    }

    const results = [];

    // Helper to evaluate date range
    const matchesDateRange = (dateStr) => {
      if (!dateStr) return true;
      const d = String(dateStr).split('T')[0];
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    };

    // =========================================================================
    // 1. Workforce Members (Employees) — Excluded from Customers
    // =========================================================================
    if (!perms.isCustomer && (type === 'all' || type === 'employees')) {
      const workforce = await this.fetchWorkforce(organizationId);
      const filtered = workforce.filter((w) => {
        if (w.organization_id !== organizationId || w.deleted_at) return false;
        if (statusFilter && (w.status || '').toLowerCase() !== statusFilter) return false;
        if (!matchesDateRange(w.created_at)) return false;

        if (term) {
          const haystack = `${w.first_name} ${w.last_name} ${w.email} ${w.designation} ${w.department} ${w.employee_code}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'employees',
          title: `${item.first_name} ${item.last_name}`,
          subtitle: `${item.designation || 'Staff'} • ${item.department || 'Operations'} (${item.employee_code || ''})`,
          status: item.status || 'active',
          priority: null,
          date: item.created_at ? item.created_at.split('T')[0] : null,
          url: '/workforce',
          metadata: {
            email: item.email,
            department: item.department,
            designation: item.designation,
            employee_code: item.employee_code
          }
        });
      }
    }

    // =========================================================================
    // 2. Customers — Excluded from Customers (Anti-IDOR)
    // =========================================================================
    if (!perms.isCustomer && (type === 'all' || type === 'customers')) {
      const customers = await this.fetchCustomers(organizationId);
      const filtered = customers.filter((c) => {
        if (c.organization_id !== organizationId || c.deleted_at) return false;
        if (statusFilter && (c.status || '').toLowerCase() !== statusFilter) return false;
        if (!matchesDateRange(c.created_at)) return false;

        if (term) {
          const haystack = `${c.name} ${c.company_name} ${c.contact_name} ${c.email} ${c.customer_code}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'customers',
          title: item.name || item.company_name,
          subtitle: `Contact: ${item.contact_name || 'N/A'} • ${item.email || ''}`,
          status: item.status || 'active',
          priority: item.sla_tier || null,
          date: item.created_at ? item.created_at.split('T')[0] : null,
          url: '/clients',
          metadata: {
            customer_code: item.customer_code,
            email: item.email,
            phone: item.phone
          }
        });
      }
    }

    // =========================================================================
    // 3. Projects — Customers see only their own projects
    // =========================================================================
    if (type === 'all' || type === 'projects') {
      const projects = await this.fetchProjects(organizationId);
      const filtered = projects.filter((p) => {
        if (p.organization_id !== organizationId || p.deleted_at) return false;
        if (perms.isCustomer && p.customer_id !== customerRecord?.id) return false;
        if (statusFilter && (p.status || '').toLowerCase() !== statusFilter) return false;
        if (!matchesDateRange(p.created_at || p.start_date)) return false;

        if (term) {
          const haystack = `${p.name} ${p.project_code} ${p.client} ${p.description || ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'projects',
          title: item.name,
          subtitle: `Project ${item.project_code || ''} • Client: ${item.client || 'General'}`,
          status: item.status || 'in_progress',
          priority: item.health || null,
          date: item.start_date || (item.created_at ? item.created_at.split('T')[0] : null),
          url: `/projects/${item.id}`,
          metadata: {
            project_code: item.project_code,
            progress: item.progress,
            budget: item.budget
          }
        });
      }
    }

    // =========================================================================
    // 4. Tasks — Internal staff only (excluded from Customers)
    // =========================================================================
    if (!perms.isCustomer && (type === 'all' || type === 'tasks')) {
      const tasks = await this.fetchTasks(organizationId);
      const filtered = tasks.filter((t) => {
        if (t.organization_id !== organizationId || t.deleted_at) return false;
        if (statusFilter && (t.status || '').toLowerCase() !== statusFilter) return false;
        if (priorityFilter && (t.priority || '').toLowerCase() !== priorityFilter) return false;
        if (!matchesDateRange(t.created_at || t.due_date)) return false;

        if (term) {
          const haystack = `${t.title} ${t.description || ''} ${t.priority || ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'tasks',
          title: item.title,
          subtitle: `Priority: ${(item.priority || 'medium').toUpperCase()} • Due: ${item.due_date || 'No due date'}`,
          status: item.status || 'todo',
          priority: item.priority || 'medium',
          date: item.due_date || (item.created_at ? item.created_at.split('T')[0] : null),
          url: '/tasks',
          metadata: {
            priority: item.priority,
            project_id: item.project_id,
            assigned_to: item.assigned_to
          }
        });
      }
    }

    // =========================================================================
    // 5. Service Requests — Customers see only their own
    // =========================================================================
    if (type === 'all' || type === 'service_requests') {
      const requests = await this.fetchServiceRequests(organizationId);
      const filtered = requests.filter((sr) => {
        if (sr.organization_id !== organizationId || sr.deleted_at) return false;
        if (perms.isCustomer && sr.customer_id !== customerRecord?.id) return false;
        if (statusFilter && (sr.status || '').toLowerCase() !== statusFilter) return false;
        if (priorityFilter && (sr.priority || '').toLowerCase() !== priorityFilter) return false;
        if (!matchesDateRange(sr.created_at)) return false;

        if (term) {
          const haystack = `${sr.title} ${sr.request_number || ''} ${sr.category} ${sr.description || ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'service_requests',
          title: item.title,
          subtitle: `Request ${item.request_number || ''} • Category: ${item.category}`,
          status: item.status || 'submitted',
          priority: item.priority || 'medium',
          date: item.created_at ? item.created_at.split('T')[0] : null,
          url: perms.isCustomer ? '/customer/services' : '/services',
          metadata: {
            request_number: item.request_number,
            category: item.category,
            priority: item.priority
          }
        });
      }
    }

    // =========================================================================
    // 6. Inventory Items — Internal staff only (excluded from Customers)
    // =========================================================================
    if (!perms.isCustomer && (type === 'all' || type === 'inventory')) {
      const inventory = await this.fetchInventory(organizationId);
      const filtered = inventory.filter((inv) => {
        if (inv.organization_id !== organizationId || inv.deleted_at) return false;
        if (statusFilter && (inv.status || '').toLowerCase() !== statusFilter) return false;
        if (!matchesDateRange(inv.created_at)) return false;

        if (term) {
          const haystack = `${inv.sku} ${inv.name} ${inv.category} ${inv.location || ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'inventory',
          title: item.name,
          subtitle: `SKU: ${item.sku} • In Stock: ${item.in_stock} • Location: ${item.location || 'Warehouse'}`,
          status: item.status || 'in_stock',
          priority: item.in_stock <= (item.reorder_level || 5) ? 'high' : 'low',
          date: item.created_at ? item.created_at.split('T')[0] : null,
          url: '/inventory',
          metadata: {
            sku: item.sku,
            in_stock: item.in_stock,
            unit_cost: item.unit_cost,
            category: item.category
          }
        });
      }
    }

    // =========================================================================
    // 7. Invoices — Managers/Admins see all; Customers see ONLY their own
    // =========================================================================
    if ((perms.isManager || perms.isCustomer) && (type === 'all' || type === 'invoices')) {
      const invoices = await this.fetchInvoices(organizationId);
      const filtered = invoices.filter((inv) => {
        if (inv.organization_id !== organizationId || inv.deleted_at) return false;
        if (perms.isCustomer && inv.customer_id !== customerRecord?.id) return false;
        if (statusFilter && (inv.status || '').toLowerCase() !== statusFilter) return false;
        if (!matchesDateRange(inv.issue_date || inv.created_at)) return false;

        if (term) {
          const haystack = `${inv.invoice_number} ${inv.customer_name || ''} ${inv.desc || ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      for (const item of filtered) {
        results.push({
          id: item.id,
          entity_type: 'invoices',
          title: `Invoice ${item.invoice_number}`,
          subtitle: `Client: ${item.customer_name || 'Client'} • Total: $${Number(item.total || 0).toFixed(2)}`,
          status: item.status || 'pending',
          priority: item.status === 'overdue' ? 'urgent' : 'normal',
          date: item.issue_date || (item.created_at ? item.created_at.split('T')[0] : null),
          url: perms.isCustomer ? '/customer/invoices' : '/invoices',
          metadata: {
            invoice_number: item.invoice_number,
            total: item.total,
            balance_due: item.balance_due
          }
        });
      }
    }

    // =========================================================================
    // Sorting & Strict Pagination
    // =========================================================================
    const sortField = queryParams.sortBy || 'title';
    const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;

    results.sort((a, b) => {
      const valA = a[sortField] || a.title || '';
      const valB = b[sortField] || b.title || '';
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    const totalItems = results.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = results.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Permission-aware Data Export to CSV
   */
  async exportData(organizationId, options = {}, userContext = {}) {
    if (!organizationId) {
      throw new TenantIsolationError('organizationId is required for data export');
    }

    const { role, userId } = userContext;
    const perms = this.getPermissions(role);
    const entity = options.entity;

    if (!entity) {
      throw new ValidationError('Export entity type is required');
    }

    // Permission enforcement
    if (perms.isCustomer) {
      // Customer is strictly forbidden from exporting internal workforce, customers, inventory, or internal tasks
      if (['employees', 'customers', 'tasks', 'inventory'].includes(entity)) {
        throw new ForbiddenError(
          `Access Denied: Customer accounts are not permitted to export ${entity}`
        );
      }
    }

    if (perms.isEmployee && !perms.isManager) {
      // Regular employees cannot export billing invoices
      if (entity === 'invoices') {
        throw new ForbiddenError(
          'Access Denied: Employee role cannot export company billing invoices'
        );
      }
    }

    let customerRecord = null;
    if (perms.isCustomer) {
      if (userContext.customerId) {
        customerRecord = { id: userContext.customerId };
      } else {
        customerRecord = await this.getCustomerForUser(userId, organizationId);
      }
    }

    const maxLimit = Math.min(1000, Number(options.limit) || 500);
    const statusFilter = (options.status || '').toLowerCase();
    const priorityFilter = (options.priority || '').toLowerCase();
    const searchTerm = (options.search || options.q || '').toLowerCase();

    const matchesDate = (dateStr) => {
      if (!dateStr) return true;
      const d = String(dateStr).split('T')[0];
      if (options.from_date && d < options.from_date) return false;
      if (options.to_date && d > options.to_date) return false;
      return true;
    };

    let csvContent = '';
    let rowCount = 0;
    let exportedRows = [];
    const today = new Date().toISOString().split('T')[0];

    switch (entity) {
      case 'employees': {
        const rows = (await this.fetchWorkforce(organizationId))
          .filter((w) => {
            if (w.organization_id !== organizationId || w.deleted_at) return false;
            if (statusFilter && (w.status || '').toLowerCase() !== statusFilter) return false;
            if (!matchesDate(w.created_at)) return false;
            if (searchTerm) {
              const h = `${w.first_name} ${w.last_name} ${w.email} ${w.designation}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'Employee Code', accessor: (r) => r.employee_code || r.id },
          { header: 'First Name', accessor: (r) => r.first_name },
          { header: 'Last Name', accessor: (r) => r.last_name },
          { header: 'Email', accessor: (r) => r.email },
          { header: 'Department', accessor: (r) => r.department || '' },
          { header: 'Designation', accessor: (r) => r.designation || '' },
          { header: 'Employment Type', accessor: (r) => r.employment_type || 'full_time' },
          { header: 'Status', accessor: (r) => r.status || 'active' },
          { header: 'Hourly Rate', accessor: (r) => r.hourly_rate ? `$${Number(r.hourly_rate).toFixed(2)}` : '' }
        ]);
        break;
      }

      case 'customers': {
        const rows = (await this.fetchCustomers(organizationId))
          .filter((c) => {
            if (c.organization_id !== organizationId || c.deleted_at) return false;
            if (statusFilter && (c.status || '').toLowerCase() !== statusFilter) return false;
            if (!matchesDate(c.created_at)) return false;
            if (searchTerm) {
              const h = `${c.name} ${c.company_name} ${c.email}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'Customer Code', accessor: (r) => r.customer_code || r.id },
          { header: 'Name', accessor: (r) => r.name || r.company_name },
          { header: 'Contact Person', accessor: (r) => r.contact_name || '' },
          { header: 'Email', accessor: (r) => r.email || '' },
          { header: 'Phone', accessor: (r) => r.phone || '' },
          { header: 'SLA Tier', accessor: (r) => r.sla_tier || 'standard' },
          { header: 'Status', accessor: (r) => r.status || 'active' }
        ]);
        break;
      }

      case 'projects': {
        const rows = (await this.fetchProjects(organizationId))
          .filter((p) => {
            if (p.organization_id !== organizationId || p.deleted_at) return false;
            if (perms.isCustomer && p.customer_id !== customerRecord?.id) return false;
            if (statusFilter && (p.status || '').toLowerCase() !== statusFilter) return false;
            if (!matchesDate(p.created_at || p.start_date)) return false;
            if (searchTerm) {
              const h = `${p.name} ${p.project_code} ${p.client}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'Project Code', accessor: (r) => r.project_code || r.id },
          { header: 'Project Name', accessor: (r) => r.name },
          { header: 'Client', accessor: (r) => r.client || '' },
          { header: 'Status', accessor: (r) => r.status || 'in_progress' },
          { header: 'Health', accessor: (r) => r.health || 'on_track' },
          { header: 'Progress (%)', accessor: (r) => `${r.progress || 0}%` },
          { header: 'Budget ($)', accessor: (r) => r.budget ? `$${Number(r.budget).toFixed(2)}` : '$0.00' },
          { header: 'Target Date', accessor: (r) => r.target_date || '' }
        ]);
        break;
      }

      case 'tasks': {
        const rows = (await this.fetchTasks(organizationId))
          .filter((t) => {
            if (t.organization_id !== organizationId || t.deleted_at) return false;
            if (statusFilter && (t.status || '').toLowerCase() !== statusFilter) return false;
            if (priorityFilter && (t.priority || '').toLowerCase() !== priorityFilter) return false;
            if (!matchesDate(t.created_at || t.due_date)) return false;
            if (searchTerm) {
              const h = `${t.title} ${t.description}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'Task ID', accessor: (r) => r.id },
          { header: 'Title', accessor: (r) => r.title },
          { header: 'Status', accessor: (r) => r.status || 'todo' },
          { header: 'Priority', accessor: (r) => (r.priority || 'medium').toUpperCase() },
          { header: 'Due Date', accessor: (r) => r.due_date || 'None' },
          { header: 'Project ID', accessor: (r) => r.project_id || '' }
        ]);
        break;
      }

      case 'service_requests': {
        const rows = (await this.fetchServiceRequests(organizationId))
          .filter((sr) => {
            if (sr.organization_id !== organizationId || sr.deleted_at) return false;
            if (perms.isCustomer && sr.customer_id !== customerRecord?.id) return false;
            if (statusFilter && (sr.status || '').toLowerCase() !== statusFilter) return false;
            if (priorityFilter && (sr.priority || '').toLowerCase() !== priorityFilter) return false;
            if (!matchesDate(sr.created_at)) return false;
            if (searchTerm) {
              const h = `${sr.title} ${sr.request_number} ${sr.category}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'Request Code', accessor: (r) => r.request_number || r.id },
          { header: 'Title', accessor: (r) => r.title },
          { header: 'Category', accessor: (r) => r.category },
          { header: 'Priority', accessor: (r) => (r.priority || 'medium').toUpperCase() },
          { header: 'Status', accessor: (r) => r.status || 'submitted' },
          { header: 'Customer ID', accessor: (r) => r.customer_id || '' },
          { header: 'Created Date', accessor: (r) => r.created_at ? r.created_at.split('T')[0] : '' }
        ]);
        break;
      }

      case 'inventory': {
        const rows = (await this.fetchInventory(organizationId))
          .filter((inv) => {
            if (inv.organization_id !== organizationId || inv.deleted_at) return false;
            if (statusFilter && (inv.status || '').toLowerCase() !== statusFilter) return false;
            if (!matchesDate(inv.created_at)) return false;
            if (searchTerm) {
              const h = `${inv.sku} ${inv.name} ${inv.category}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'SKU', accessor: (r) => r.sku },
          { header: 'Item Name', accessor: (r) => r.name },
          { header: 'Category', accessor: (r) => r.category },
          { header: 'Quantity In Stock', accessor: (r) => r.in_stock },
          { header: 'Unit Cost ($)', accessor: (r) => r.unit_cost ? `$${Number(r.unit_cost).toFixed(2)}` : '$0.00' },
          { header: 'Location', accessor: (r) => r.location || '' },
          { header: 'Status', accessor: (r) => r.status || 'in_stock' }
        ]);
        break;
      }

      case 'invoices': {
        const rows = (await this.fetchInvoices(organizationId))
          .filter((inv) => {
            if (inv.organization_id !== organizationId || inv.deleted_at) return false;
            if (perms.isCustomer && inv.customer_id !== customerRecord?.id) return false;
            if (statusFilter && (inv.status || '').toLowerCase() !== statusFilter) return false;
            if (!matchesDate(inv.issue_date || inv.created_at)) return false;
            if (searchTerm) {
              const h = `${inv.invoice_number} ${inv.customer_name}`.toLowerCase();
              if (!h.includes(searchTerm)) return false;
            }
            return true;
          })
          .slice(0, maxLimit);

        rowCount = rows.length;
        exportedRows = rows;
        csvContent = this.buildCsv(rows, [
          { header: 'Invoice Number', accessor: (r) => r.invoice_number },
          { header: 'Client', accessor: (r) => r.customer_name || '' },
          { header: 'Issue Date', accessor: (r) => r.issue_date },
          { header: 'Due Date', accessor: (r) => r.due_date },
          { header: 'Subtotal ($)', accessor: (r) => `$${Number(r.subtotal || 0).toFixed(2)}` },
          { header: 'Tax ($)', accessor: (r) => `$${Number(r.tax || 0).toFixed(2)}` },
          { header: 'Total ($)', accessor: (r) => `$${Number(r.total || 0).toFixed(2)}` },
          { header: 'Paid Amount ($)', accessor: (r) => `$${Number(r.paid_amount || 0).toFixed(2)}` },
          { header: 'Balance Due ($)', accessor: (r) => `$${Number(r.balance_due || 0).toFixed(2)}` },
          { header: 'Status', accessor: (r) => r.status || 'pending' }
        ]);
        break;
      }

      default:
        throw new ValidationError(`Unsupported export entity: ${entity}`);
    }

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'DATA_EXPORTED',
      entityType: entity.toUpperCase(),
      entityId: organizationId,
      metadata: { entity, rowCount, format: 'csv' }
    });

    return {
      csvContent,
      data: exportedRows,
      filename: `${entity}-export-${today}.csv`,
      rowCount
    };
  }
}

export const searchService = new SearchService();
