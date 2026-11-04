import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOTYPE_PROJECTS,
  PROTOTYPE_KANBAN_TASKS,
  PROTOTYPE_SERVICE_REQUESTS,
  PROTOTYPE_WORK_ORDERS,
  PROTOTYPE_INVENTORY,
  PROTOTYPE_EXPENSES,
  PROTOTYPE_ANALYTICS
} from '../../client/src/data/prototypeData.js';

describe('UI/UX Prototype Data Integrity & Contract Test Suite', () => {
  it('1. PROTOTYPE_PROJECTS contains valid structures and milestone arrays', () => {
    assert.ok(Array.isArray(PROTOTYPE_PROJECTS), 'Projects should be an array');
    assert.ok(PROTOTYPE_PROJECTS.length >= 3, 'Should have at least 3 prototype projects');

    for (const project of PROTOTYPE_PROJECTS) {
      assert.ok(project.id && project.id.startsWith('PRJ-'), 'Project ID format valid');
      assert.ok(project.name && project.name.length > 5, 'Project name valid');
      assert.ok(project.client, 'Client name present');
      assert.ok(
        ['in_progress', 'on_hold', 'completed', 'planning'].includes(project.status),
        `Status ${project.status} is valid`
      );
      assert.ok(
        typeof project.progress === 'number' && project.progress >= 0 && project.progress <= 100
      );
      assert.ok(
        Array.isArray(project.milestones) && project.milestones.length > 0,
        'Milestones present'
      );
      assert.ok(Array.isArray(project.team) && project.team.length > 0, 'Team present');
    }
  });

  it('2. PROTOTYPE_KANBAN_TASKS adheres to 4-column agile kanban workflow', () => {
    assert.ok(Array.isArray(PROTOTYPE_KANBAN_TASKS), 'Tasks should be an array');
    assert.ok(PROTOTYPE_KANBAN_TASKS.length >= 5, 'Should have at least 5 prototype tasks');

    const validColumns = ['todo', 'in_progress', 'review', 'completed'];
    const validPriorities = ['urgent', 'high', 'normal', 'low'];

    for (const task of PROTOTYPE_KANBAN_TASKS) {
      assert.ok(task.id && task.id.startsWith('TSK-'), 'Task ID format valid');
      assert.ok(validColumns.includes(task.column), `Column ${task.column} valid`);
      assert.ok(validPriorities.includes(task.priority), `Priority ${task.priority} valid`);
      assert.ok(task.assignedTo?.name, 'Assigned user present');
      assert.ok(typeof task.checklistCompleted === 'number');
      assert.ok(typeof task.checklistTotal === 'number');
      assert.ok(
        task.checklistCompleted <= task.checklistTotal,
        'Completed checklist cannot exceed total'
      );
    }
  });

  it('3. PROTOTYPE_SERVICE_REQUESTS includes SLA urgencies and status codes', () => {
    assert.ok(Array.isArray(PROTOTYPE_SERVICE_REQUESTS), 'Service requests array valid');
    const validUrgencies = ['critical', 'urgent', 'high', 'normal', 'low'];
    const validStatuses = ['new', 'assigned', 'in_review', 'converted'];

    for (const req of PROTOTYPE_SERVICE_REQUESTS) {
      assert.ok(req.id && req.id.startsWith('SR-'), 'SR ID format valid');
      assert.ok(req.client && req.contact, 'Client and contact present');
      assert.ok(validUrgencies.includes(req.urgency), `Urgency ${req.urgency} valid`);
      assert.ok(validStatuses.includes(req.status), `Status ${req.status} valid`);
    }
  });

  it('4. PROTOTYPE_WORK_ORDERS has valid assets, technicians, and interactive checklists', () => {
    assert.ok(Array.isArray(PROTOTYPE_WORK_ORDERS), 'Work orders array valid');
    const validStatuses = ['draft', 'dispatched', 'in_progress', 'review', 'completed'];

    for (const wo of PROTOTYPE_WORK_ORDERS) {
      assert.ok(wo.id && wo.id.startsWith('WO-'), 'Work order ID format valid');
      assert.ok(wo.technician, 'Technician assigned');
      assert.ok(wo.asset, 'Asset identified');
      assert.ok(validStatuses.includes(wo.status), `Status ${wo.status} valid`);
      assert.ok(Array.isArray(wo.checklist) && wo.checklist.length > 0, 'Checklist items present');
      for (const item of wo.checklist) {
        assert.ok(typeof item.text === 'string' && item.text.length > 0);
        assert.ok(typeof item.done === 'boolean');
      }
    }
  });

  it('5. PROTOTYPE_INVENTORY maintains correct stock counters and threshold statuses', () => {
    assert.ok(Array.isArray(PROTOTYPE_INVENTORY), 'Inventory array valid');
    const validStatuses = ['in_stock', 'low_stock', 'out_of_stock'];

    for (const part of PROTOTYPE_INVENTORY) {
      assert.ok(part.sku, 'Part SKU valid');
      assert.ok(part.location, 'Part warehouse location assigned');
      assert.ok(typeof part.inStock === 'number' && part.inStock >= 0, 'Stock count non-negative');
      assert.ok(typeof part.reorderLevel === 'number');
      assert.ok(validStatuses.includes(part.status), `Status ${part.status} valid`);
    }
  });

  it('6. PROTOTYPE_EXPENSES verifies receipts and approved/pending lifecycle states', () => {
    assert.ok(Array.isArray(PROTOTYPE_EXPENSES), 'Expenses array valid');
    const validStatuses = ['approved', 'pending', 'rejected'];

    for (const exp of PROTOTYPE_EXPENSES) {
      assert.ok(exp.id && exp.id.startsWith('EXP-'), 'Expense ID format valid');
      assert.ok(exp.employee, 'Employee present');
      assert.ok(typeof exp.receiptAttached === 'boolean');
      assert.ok(validStatuses.includes(exp.status), `Status ${exp.status} valid`);
    }
  });

  it('7. PROTOTYPE_ANALYTICS delivers full executive operational telemetry', () => {
    assert.ok(PROTOTYPE_ANALYTICS.kpis, 'KPIs object present');
    assert.ok(PROTOTYPE_ANALYTICS.kpis.workforceUtilization);
    assert.ok(PROTOTYPE_ANALYTICS.kpis.slaCompliance);
    assert.ok(PROTOTYPE_ANALYTICS.kpis.meanTimeToResolve);
    assert.ok(PROTOTYPE_ANALYTICS.kpis.netProfitMargin);

    assert.ok(Array.isArray(PROTOTYPE_ANALYTICS.utilizationByDepartment));
    assert.ok(Array.isArray(PROTOTYPE_ANALYTICS.monthlyRevenueVsExpense));
    assert.ok(Array.isArray(PROTOTYPE_ANALYTICS.workOrdersByStatus));
  });
});
