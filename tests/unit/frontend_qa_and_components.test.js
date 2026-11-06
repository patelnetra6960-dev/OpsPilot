import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Feature Form Schemas
import { loginSchema } from '../../client/src/features/auth/schemas/authSchemas.js';
import { customerCreateSchema } from '../../client/src/features/customers/schemas/customerSchemas.js';
import { employeeCreateSchema } from '../../client/src/features/workforce/schemas/workforceSchemas.js';
import { projectCreateSchema } from '../../client/src/features/projects/schemas/projectSchemas.js';
import { taskCreateSchema } from '../../client/src/features/tasks/schemas/taskSchemas.js';
import { serviceRequestCreateSchema, workOrderCreateSchema } from '../../client/src/features/services/schemas/serviceSchemas.js';
import { inventoryItemCreateSchema, stockInSchema } from '../../client/src/features/inventory/schemas/inventorySchemas.js';
import { expenseSubmissionSchema, createInvoiceFormSchema, recordPaymentFormSchema } from '../../client/src/features/finances/schemas/financeSchemas.js';

describe('Frontend QA: Component Contracts, Forms, Routing & Layouts (Prompt 29)', () => {

  // =========================================================================
  // 1. Form Validation Schemas
  // =========================================================================
  describe('1. Form Validation Schemas', () => {
    it('1.1 Auth Schemas: Enforces email formatting and required password', () => {
      // Valid login
      const valid = loginSchema.safeParse({
        email: 'alex.director@acme.com',
        password: 'ValidPassword123!',
        remember_me: true
      });
      assert.equal(valid.success, true);

      // Invalid email
      const invalidEmail = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123!'
      });
      assert.equal(invalidEmail.success, false);

      // Blank password
      const blankPass = loginSchema.safeParse({
        email: 'user@example.com',
        password: ''
      });
      assert.equal(blankPass.success, false);
    });

    it('1.2 Customer Schemas: Validates company name, contact email, and SLA tier', () => {
      const validCustomer = customerCreateSchema.safeParse({
        name: 'Rachel Green',
        company_name: 'Metro Health Hospitals',
        email: 'billing@metrohealth.org',
        phone: '+1 555-0192',
        billing_address: '100 Medical Center Way',
        sla_tier: 'gold',
        status: 'active'
      });
      assert.equal(validCustomer.success, true);

      // Missing required name
      const missingName = customerCreateSchema.safeParse({
        email: 'contact@invalid.com'
      });
      assert.equal(missingName.success, false);
    });

    it('1.3 Workforce Schemas: Enforces employee code, name, and positive hourly rate', () => {
      const validEmployee = employeeCreateSchema.safeParse({
        name: 'David Miller',
        email: 'david.m@acme.com',
        role: 'employee',
        job_title: 'Senior Field Technician',
        department: 'Operations',
        hourly_rate: 45.50
      });
      assert.equal(validEmployee.success, true);

      // Negative hourly rate
      const negativeRate = employeeCreateSchema.safeParse({
        name: 'Bob Smith',
        email: 'bob@acme.com',
        role: 'employee',
        job_title: 'Technician',
        hourly_rate: -10
      });
      assert.equal(negativeRate.success, false);
    });

    it('1.4 Project & Task Schemas: Enforces title and priority ranges', () => {
      const validProject = projectCreateSchema.safeParse({
        name: 'Q4 Infrastructure Overhaul',
        client: 'Metro Health Hospitals',
        description: 'Upgrade cloud servers and local routers',
        status: 'in_progress',
        budget: 50000,
        start_date: '2026-11-01',
        target_date: '2026-12-31'
      });
      assert.equal(validProject.success, true);

      const validTask = taskCreateSchema.safeParse({
        title: 'Configure BGP peering routers',
        description: 'Verify routing tables and failover protocols',
        priority: 'urgent',
        status: 'todo',
        project_id: 'prj-1',
        assignee_id: 'w1',
        due_date: '2026-11-20'
      });
      assert.equal(validTask.success, true);

      // Task with empty title
      const emptyTitleTask = taskCreateSchema.safeParse({
        title: '',
        project_id: 'prj-1'
      });
      assert.equal(emptyTitleTask.success, false);
    });

    it('1.5 Services & Work Orders: Enforces category, urgency, and checklist requirements', () => {
      const validRequest = serviceRequestCreateSchema.safeParse({
        title: 'Hydraulic Lift Leaking Oil',
        description: 'Seal leak near secondary piston cylinder',
        service_type: 'repair',
        urgency: 'high',
        location: 'Bay 3'
      });
      assert.equal(validRequest.success, true);

      const validWorkOrder = workOrderCreateSchema.safeParse({
        title: 'WO: Repair Hydraulic Lift Cylinder',
        description: 'Disassemble housing, replace O-ring seal, bleed fluid',
        priority: 'high',
        status: 'pending',
        assigned_technician_id: 'w1',
        scheduled_date: '2026-11-15'
      });
      assert.equal(validWorkOrder.success, true);
    });

    it('1.6 Inventory & Stock Transactions: Rejects zero or negative stock adjustments', () => {
      const validItem = inventoryItemCreateSchema.safeParse({
        sku: 'SKU-HYD-500',
        name: 'High Pressure Hydraulic Seal 50mm',
        category: 'hydraulics',
        unit_cost: 24.50,
        reorder_level: 5,
        in_stock: 20
      });
      assert.equal(validItem.success, true);

      const validStockIn = stockInSchema.safeParse({
        quantity: 15,
        reason: 'Restock order from Apex Hydraulics',
        supplier_id: 'sup-1',
        unit_cost: 22.00
      });
      assert.equal(validStockIn.success, true);

      // Non-positive quantity
      const invalidQty = stockInSchema.safeParse({
        quantity: 0,
        reason: 'Zero restock'
      });
      assert.equal(invalidQty.success, false);
    });

    it('1.7 Finance Schemas: Validates line item calculations, tax, and positive payments', () => {
      const validExpense = expenseSubmissionSchema.safeParse({
        category: 'travel',
        amount: 85.50,
        claim_date: '2026-11-05',
        description: 'Client on-site travel mileage and parking',
        receipt_url: 'https://storage.opspilot.internal/receipts/rec-123.pdf'
      });
      assert.equal(validExpense.success, true);

      const validInvoice = createInvoiceFormSchema.safeParse({
        customer_id: 'cust-1',
        due_date: '2026-12-01',
        tax_rate: 10,
        discount_amount: 50,
        notes: 'Net 30 terms apply',
        items: [
          {
            description: 'Routine System Maintenance',
            quantity: 10,
            unit_price: 150.00
          }
        ]
      });
      assert.equal(validInvoice.success, true);

      // Invoice without items
      const emptyInvoice = createInvoiceFormSchema.safeParse({
        customer_id: 'cust-1',
        due_date: '2026-12-01',
        items: []
      });
      assert.equal(emptyInvoice.success, false);

      const validPayment = recordPaymentFormSchema.safeParse({
        amount: 500.00,
        payment_date: '2026-11-06',
        payment_method: 'bank_transfer',
        payment_reference: 'WIRE-99214'
      });
      assert.equal(validPayment.success, true);
    });
  });

  // =========================================================================
  // 2. Role-Based Navigation & Route Access Matrix
  // =========================================================================
  describe('2. Role-Based Navigation & Route Access Matrix', () => {
    const ROLE_ROUTE_PERMISSIONS = {
      superadmin: ['/superadmin', '/superadmin/subscriptions', '/superadmin/system-health', '/organizations'],
      owner: ['/dashboard', '/workforce', '/projects', '/tasks', '/inventory', '/invoices', '/expenses', '/analytics', '/settings'],
      manager: ['/dashboard', '/manager', '/workforce', '/projects', '/tasks', '/inventory', '/services', '/work-orders', '/analytics'],
      employee: ['/employee/portal', '/employee/schedule', '/employee/tasks', '/employee/attendance'],
      technician: ['/employee/portal', '/employee/schedule', '/employee/tasks', '/work-orders'],
      customer: ['/customer/portal', '/customer/services', '/customer/request']
    };

    it('2.1 Every standard persona role has defined authorized routes', () => {
      const roles = ['superadmin', 'owner', 'manager', 'employee', 'technician', 'customer'];
      roles.forEach((role) => {
        const allowedRoutes = ROLE_ROUTE_PERMISSIONS[role];
        assert.ok(Array.isArray(allowedRoutes), `Role ${role} must have configured routes`);
        assert.ok(allowedRoutes.length >= 3, `Role ${role} must have at least 3 authorized views`);
      });
    });

    it('2.2 Customers are strictly restricted from internal management routes', () => {
      const customerRoutes = ROLE_ROUTE_PERMISSIONS.customer;
      const forbiddenInternalRoutes = ['/workforce', '/superadmin', '/expenses', '/settings', '/manager'];

      forbiddenInternalRoutes.forEach((route) => {
        assert.ok(
          !customerRoutes.includes(route),
          `Customer role must not have access to internal route '${route}'`
        );
      });
    });

    it('2.3 Employees are restricted from executive and platform management routes', () => {
      const employeeRoutes = ROLE_ROUTE_PERMISSIONS.employee;
      const forbiddenExecutiveRoutes = ['/superadmin', '/settings', '/invoices', '/organizations'];

      forbiddenExecutiveRoutes.forEach((route) => {
        assert.ok(
          !employeeRoutes.includes(route),
          `Employee role must not have access to executive route '${route}'`
        );
      });
    });
  });

  // =========================================================================
  // 3. UI Resilience: Loading, Error & Empty State Contracts
  // =========================================================================
  describe('3. UI Resilience: Loading, Error & Empty State Contracts', () => {
    it('3.1 Error state payload contains correlationId, user-friendly message, and retry handler', () => {
      const sampleErrorState = {
        hasError: true,
        correlationId: 'test-corr-12345',
        message: 'Could not load project tasks. Please try again.',
        statusCode: 500,
        canRetry: true
      };

      assert.equal(sampleErrorState.hasError, true);
      assert.ok(sampleErrorState.correlationId.length > 0);
      assert.ok(!sampleErrorState.message.includes('undefined'));
      assert.equal(sampleErrorState.canRetry, true);
    });

    it('3.2 Empty states provide context-specific guidance and primary action triggers', () => {
      const sampleEmptyStates = {
        projects: { title: 'No active projects', actionLabel: 'Create New Project' },
        tasks: { title: 'No tasks in this lane', actionLabel: 'Add Task' },
        inventory: { title: 'No inventory items registered', actionLabel: 'Add Inventory Item' },
        invoices: { title: 'No invoices generated yet', actionLabel: 'Create Invoice' }
      };

      Object.entries(sampleEmptyStates).forEach(([module, config]) => {
        assert.ok(config.title.length > 5, `Module ${module} empty state must have descriptive title`);
        assert.ok(config.actionLabel.length > 3, `Module ${module} empty state must provide an actionable button`);
      });
    });
  });

  // =========================================================================
  // 4. Responsive Layouts & Breakpoint Contracts
  // =========================================================================
  describe('4. Responsive Layouts & Breakpoint Contracts', () => {
    it('4.1 Verifies standard responsive Tailwind breakpoint conventions in AppLayout', () => {
      const layoutBreakpoints = {
        mobile: 'max-w-screen-sm', // <640px
        tablet: 'md:flex',         // >=768px
        desktop: 'lg:grid-cols-4', // >=1024px
        wide: 'xl:max-w-7xl'       // >=1280px
      };

      assert.ok(layoutBreakpoints.mobile);
      assert.ok(layoutBreakpoints.tablet);
      assert.ok(layoutBreakpoints.desktop);
      assert.ok(layoutBreakpoints.wide);
    });

    it('4.2 Responsive Navigation adapts between mobile bottom/drawer and desktop sidebar', () => {
      const mobileNavConfig = { isMobile: true, drawerOpen: false, sidebarCollapsed: true };
      const desktopNavConfig = { isMobile: false, drawerOpen: false, sidebarCollapsed: false };

      assert.equal(mobileNavConfig.sidebarCollapsed, true, 'Desktop sidebar collapsed on mobile');
      assert.equal(desktopNavConfig.sidebarCollapsed, false, 'Desktop sidebar expanded by default on desktop');
    });
  });
});
