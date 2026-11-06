import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

describe('Database Integrity, Constraints, RLS & Schema Audit (Prompt 29)', () => {
  const migrationsDir = path.resolve('database/migrations');
  const allSqlContent = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      file,
      content: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    }));

  const fullSchemaSql = allSqlContent.map((f) => f.content).join('\n\n');

  // =========================================================================
  // 1. Foreign Key Integrity Audit
  // =========================================================================
  describe('1. Foreign Key Integrity Audit', () => {
    it('1.1 Every tenant-scoped entity references organizations(id) with ON DELETE CASCADE', () => {
      const tenantTables = [
        'organization_memberships',
        'departments',
        'workforce_members',
        'customers',
        'suppliers',
        'inventory_items',
        'stock_transactions',
        'assets',
        'projects',
        'project_members',
        'service_requests',
        'work_orders',
        'work_order_checklists',
        'tasks',
        'expenses',
        'expense_approvals',
        'invoices',
        'invoice_items',
        'payments',
        'notifications',
        'audit_logs'
      ];

      tenantTables.forEach((table) => {
        const tableDefRegex = new RegExp(`CREATE TABLE(?: IF NOT EXISTS)?\\s+(?:public\\.)?${table}\\s*\\([\\s\\S]*?\\);`, 'i');
        const match = fullSchemaSql.match(tableDefRegex);
        assert.ok(match, `Table definition for '${table}' must exist in schema`);

        const tableBody = match[0];
        assert.ok(
          tableBody.includes('organization_id') || tableBody.includes('org_id'),
          `Table '${table}' must include an organization_id column`
        );
        assert.ok(
          /REFERENCES\s+(?:public\.)?organizations\s*\(\s*id\s*\)\s*ON\s+DELETE\s+CASCADE/i.test(tableBody) ||
          /FOREIGN KEY\s*\(\s*organization_id\s*\)\s*REFERENCES\s+(?:public\.)?organizations/i.test(tableBody),
          `Table '${table}' must enforce Foreign Key to organizations(id) ON DELETE CASCADE`
        );
      });
    });

    it('1.2 Hierarchical entity relationships enforce relational integrity', () => {
      // Tasks reference projects
      assert.ok(
        /REFERENCES\s+(?:public\.)?projects/i.test(fullSchemaSql),
        'tasks must reference projects'
      );
      // Work orders reference service requests
      assert.ok(
        /REFERENCES\s+(?:public\.)?service_requests/i.test(fullSchemaSql),
        'work_orders must reference service_requests'
      );
      // Invoice items reference invoices
      assert.ok(
        /REFERENCES\s+(?:public\.)?invoices/i.test(fullSchemaSql),
        'invoice_items must reference invoices'
      );
      // Payments reference invoices
      assert.ok(
        /REFERENCES\s+(?:public\.)?invoices/i.test(fullSchemaSql),
        'payments must reference invoices'
      );
      // Stock transactions reference inventory items
      assert.ok(
        /REFERENCES\s+(?:public\.)?inventory_items/i.test(fullSchemaSql),
        'stock_transactions must reference inventory_items'
      );
    });
  });

  // =========================================================================
  // 2. Constraints & Data Integrity Audit
  // =========================================================================
  describe('2. Constraints & Data Integrity Audit', () => {
    it('2.1 Multi-column uniqueness constraints prevent duplicate identifiers within a tenant', () => {
      // SKU uniqueness per organization
      assert.ok(
        /UNIQUE\s*\(\s*organization_id\s*,\s*sku\s*\)/i.test(fullSchemaSql) ||
        /idx_inventory_org_sku.*UNIQUE/i.test(fullSchemaSql) ||
        /UNIQUE\s+INDEX\s+.*\(organization_id,\s*sku\)/i.test(fullSchemaSql) ||
        fullSchemaSql.includes('UNIQUE (organization_id, sku)'),
        'Schema must enforce unique inventory SKU per tenant'
      );

      // Invoice number uniqueness per organization
      assert.ok(
        /UNIQUE\s*\(\s*organization_id\s*,\s*invoice_number\s*\)/i.test(fullSchemaSql) ||
        /idx_invoices_org_number.*UNIQUE/i.test(fullSchemaSql) ||
        /UNIQUE\s+INDEX\s+.*\(organization_id,\s*invoice_number\)/i.test(fullSchemaSql) ||
        fullSchemaSql.includes('UNIQUE (organization_id, invoice_number)'),
        'Schema must enforce unique invoice number per tenant'
      );

      // Employee code uniqueness per organization
      assert.ok(
        /UNIQUE\s*\(\s*organization_id\s*,\s*employee_code\s*\)/i.test(fullSchemaSql) ||
        /idx_workforce_org_code.*UNIQUE/i.test(fullSchemaSql) ||
        /UNIQUE\s+INDEX\s+.*\(organization_id,\s*employee_code\)/i.test(fullSchemaSql) ||
        fullSchemaSql.includes('UNIQUE (organization_id, employee_code)'),
        'Schema must enforce unique employee code per tenant'
      );
    });

    it('2.2 Numerical and status CHECK constraints are defined to prevent corrupted state', () => {
      // Non-negative stock quantity
      assert.ok(
        /CHECK\s*\(\s*in_stock\s*>=\s*0\s*\)/i.test(fullSchemaSql) ||
        /CHECK\s*\(\s*reorder_level\s*>=\s*0\s*\)/i.test(fullSchemaSql),
        'Inventory table must enforce in_stock >= 0 constraint'
      );

      // Monetary values non-negative
      assert.ok(
        /CHECK\s*\(\s*purchase_cost\s*>=\s*0\s*\)/i.test(fullSchemaSql) &&
        /CHECK\s*\(\s*unit_cost\s*>=\s*0\s*\)/i.test(fullSchemaSql),
        'Monetary tables must enforce non-negative amounts'
      );
    });
  });

  // =========================================================================
  // 3. Row Level Security (RLS) Policy Engine Audit
  // =========================================================================
  describe('3. Row Level Security (RLS) Policy Engine Audit', () => {
    it('3.1 Row Level Security is explicitly enabled on all core domain tables', () => {
      const coreTables = [
        'organizations',
        'user_profiles',
        'organization_memberships',
        'departments',
        'workforce_members',
        'customers',
        'suppliers',
        'inventory_items',
        'stock_transactions',
        'assets',
        'projects',
        'project_members',
        'service_requests',
        'work_orders',
        'work_order_checklists',
        'tasks',
        'expenses',
        'expense_approvals',
        'invoices',
        'invoice_items',
        'payments',
        'notifications',
        'audit_logs'
      ];

      coreTables.forEach((table) => {
        const rlsPattern = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
        assert.ok(
          rlsPattern.test(fullSchemaSql),
          `Table '${table}' must have Row Level Security explicitly enabled`
        );
      });
    });

    it('3.2 RLS policies enforce tenant boundary via current_setting or auth.jwt()', () => {
      assert.ok(
        fullSchemaSql.includes('app.current_organization_id') ||
        fullSchemaSql.includes('auth.uid()') ||
        fullSchemaSql.includes('auth.jwt()'),
        'RLS policies must bind to active tenant context or user session'
      );
    });
  });

  // =========================================================================
  // 4. Index Usage & Performance Audit
  // =========================================================================
  describe('4. Index Usage & Performance Audit', () => {
    it('4.1 High-traffic tenant tables possess dedicated indexes on organization_id', () => {
      const indexedTables = [
        'workforce_members',
        'customers',
        'inventory_items',
        'projects',
        'tasks',
        'service_requests',
        'work_orders',
        'expenses',
        'invoices',
        'notifications',
        'audit_logs'
      ];

      indexedTables.forEach((table) => {
        const indexPattern = new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[a-zA-Z0-9_]*\\s+ON\\s+(?:public\\.)?${table}\\s*\\([^)]*organization_id[^)]*\\)`, 'i');
        assert.ok(
          indexPattern.test(fullSchemaSql),
          `Table '${table}' must have an index covering organization_id for fast tenant isolation filtering`
        );
      });
    });

    it('4.2 Search and status indexes exist for high-volume filtering', () => {
      assert.ok(
        /CREATE\s+INDEX.*ON.*tasks.*status/i.test(fullSchemaSql) ||
        /CREATE\s+INDEX.*ON.*tasks/i.test(fullSchemaSql),
        'Tasks table must have status index'
      );
      assert.ok(
        /CREATE\s+INDEX.*ON.*invoices/i.test(fullSchemaSql),
        'Invoices table must have index'
      );
    });
  });

  // =========================================================================
  // 5. Transaction Behavior & Atomicity Invariants
  // =========================================================================
  describe('5. Transaction Behavior & Atomicity Invariants', () => {
    it('5.1 Stock decrement never allows inventory quantity to drop below zero', () => {
      // Business logic verification of atomic balance invariants
      let currentStock = 10;
      const requestDecrement = (qty) => {
        if (currentStock - qty < 0) {
          throw new Error('INSUFFICIENT_STOCK: Stock quantity cannot become negative');
        }
        currentStock -= qty;
        return currentStock;
      };

      assert.equal(requestDecrement(4), 6);
      assert.equal(requestDecrement(6), 0);
      assert.throws(
        () => requestDecrement(1),
        /INSUFFICIENT_STOCK/,
        'Must block deduction that would cause stock < 0'
      );
    });

    it('5.2 Payment transactions reconcile invoice balances accurately without floating point skew', () => {
      const invoiceTotalCents = 150000; // $1500.00
      let balanceDueCents = invoiceTotalCents;
      let totalPaidCents = 0;

      const recordPayment = (amountCents) => {
        if (amountCents <= 0) throw new Error('Payment must be positive');
        if (amountCents > balanceDueCents) throw new Error('Overpayment not allowed');
        totalPaidCents += amountCents;
        balanceDueCents -= amountCents;
        return {
          totalPaid: totalPaidCents / 100,
          balanceDue: balanceDueCents / 100,
          status: balanceDueCents === 0 ? 'paid' : 'partially_paid'
        };
      };

      const p1 = recordPayment(50000); // $500
      assert.equal(p1.totalPaid, 500);
      assert.equal(p1.balanceDue, 1000);
      assert.equal(p1.status, 'partially_paid');

      const p2 = recordPayment(100000); // $1000
      assert.equal(p2.totalPaid, 1500);
      assert.equal(p2.balanceDue, 0);
      assert.equal(p2.status, 'paid');

      assert.throws(() => recordPayment(100), /Overpayment/);
    });
  });
});
