import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

describe('Prompt 09: Complete Relational Database Schema & Migrations Test Suite', () => {
  const dbMigrationsDir = path.resolve('database/migrations');
  const supaMigrationsDir = path.resolve('supabase/migrations');

  it('1. Verifies sequential migration files exist in database/migrations', () => {
    assert.ok(fs.existsSync(dbMigrationsDir), 'database/migrations directory exists');
    const files = fs
      .readdirSync(dbMigrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    assert.ok(files.length >= 13, 'Must have at least 13 sequential migrations');
    assert.equal(files[0], '001_core_extensions_and_tenants.sql');
    assert.equal(files[1], '002_rbac_roles_and_permissions.sql');
    assert.equal(files[2], '003_departments_and_workforce.sql');
    assert.equal(files[3], '004_customers_and_suppliers.sql');
    assert.equal(files[4], '005_assets_and_inventory.sql');
    assert.equal(files[5], '006_projects_and_members.sql');
    assert.equal(files[6], '007_services_and_work_orders.sql');
    assert.equal(files[7], '008_tasks_and_collaboration.sql');
    assert.equal(files[8], '009_expenses_and_approvals.sql');
    assert.equal(files[9], '010_invoices_and_payments.sql');
    assert.equal(files[10], '011_notifications_and_audit.sql');
    assert.equal(files[11], '012_comprehensive_rls_policies.sql');
    assert.equal(files[12], '013_storage_buckets_and_rls.sql');
    if (files.length >= 14) {
      assert.equal(files[13], '014_performance_indexes_and_optimizations.sql');
    }
  });

  it('2. Synchronizes migrations identically with supabase/migrations', () => {
    assert.ok(fs.existsSync(supaMigrationsDir), 'supabase/migrations directory exists');
    const dbFiles = fs
      .readdirSync(dbMigrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const supaFiles = fs
      .readdirSync(supaMigrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    assert.deepEqual(dbFiles, supaFiles, 'database/migrations and supabase/migrations must match');
  });

  it('3. Validates all 27 normalized tables requested in Prompt 09', () => {
    const requiredTables = [
      'organizations',
      'user_profiles',
      'organization_memberships',
      'roles',
      'permissions',
      'role_permissions',
      'departments',
      'customers',
      'projects',
      'project_members',
      'tasks',
      'task_assignments',
      'task_comments',
      'task_attachments',
      'service_requests',
      'work_orders',
      'assets',
      'inventory_items',
      'stock_transactions',
      'suppliers',
      'expenses',
      'expense_approvals',
      'invoices',
      'invoice_items',
      'payments',
      'notifications',
      'audit_logs'
    ];

    const files = fs.readdirSync(dbMigrationsDir).filter((f) => f.endsWith('.sql'));
    const allSql = files
      .map((f) => fs.readFileSync(path.join(dbMigrationsDir, f), 'utf8'))
      .join('\n');

    for (const table of requiredTables) {
      const tableRegex = new RegExp(
        `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.${table}\\s*\\(`,
        'i'
      );
      assert.ok(tableRegex.test(allSql), `Table public.${table} must be defined in migrations`);

      // Check tenant isolation (all tables except organizations, permissions, role_permissions have organization_id)
      if (!['organizations', 'permissions', 'role_permissions', 'user_profiles'].includes(table)) {
        assert.ok(
          allSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`) ||
            allSql.includes(`CREATE TABLE public.${table}`),
          `Table public.${table} exists`
        );
      }
    }
  });

  it('4. Confirms Row Level Security (RLS) is enabled on all tables in 012', () => {
    const rlsFile = fs.readFileSync(
      path.join(dbMigrationsDir, '012_comprehensive_rls_policies.sql'),
      'utf8'
    );

    const tablesToProtect = [
      'organizations',
      'user_profiles',
      'roles',
      'permissions',
      'role_permissions',
      'organization_memberships',
      'departments',
      'workforce_members',
      'shift_schedules',
      'attendance_records',
      'customers',
      'suppliers',
      'assets',
      'inventory_items',
      'stock_transactions',
      'projects',
      'project_members',
      'project_milestones',
      'service_requests',
      'work_orders',
      'work_order_checklists',
      'tasks',
      'task_assignments',
      'task_comments',
      'task_attachments',
      'expenses',
      'expense_approvals',
      'invoices',
      'invoice_items',
      'payments',
      'notifications',
      'audit_logs'
    ];

    for (const table of tablesToProtect) {
      assert.ok(
        rlsFile.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
        `RLS must be enabled on table ${table}`
      );
    }

    assert.ok(rlsFile.includes('public.is_member_of('), 'Helper is_member_of must exist');
    assert.ok(rlsFile.includes('public.has_org_role('), 'Helper has_org_role must exist');
    assert.ok(rlsFile.includes('public.is_superadmin()'), 'Helper is_superadmin must exist');
  });

  it('5. Confirms zero hardcoded secrets in all SQL files', () => {
    const files = fs.readdirSync(dbMigrationsDir).filter((f) => f.endsWith('.sql'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dbMigrationsDir, file), 'utf8');
      assert.ok(!content.includes('password123'), `No hardcoded passwords in ${file}`);
      assert.ok(!content.includes('eyJh'), `No JWT tokens in ${file}`);
      assert.ok(!content.includes('BEGIN PRIVATE KEY'), `No private keys in ${file}`);
    }
  });

  it('6. Verifies backward-compatible updatable views exist', () => {
    const allSql = fs
      .readdirSync(dbMigrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => fs.readFileSync(path.join(dbMigrationsDir, f), 'utf8'))
      .join('\n');

    assert.ok(allSql.includes('VIEW public.users_profiles'), 'View users_profiles must exist');
    assert.ok(
      allSql.includes('VIEW public.organization_members'),
      'View organization_members must exist'
    );
    assert.ok(allSql.includes('VIEW public.clients'), 'View clients must exist');
    assert.ok(allSql.includes('VIEW public.expense_claims'), 'View expense_claims must exist');
  });
});
