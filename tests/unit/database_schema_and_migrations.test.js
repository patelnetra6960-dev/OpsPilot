import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

describe('Supabase Database Foundation & Migrations Test Suite', () => {
  const dbMigrationsDir = path.resolve('database/migrations');
  const supaMigrationsDir = path.resolve('supabase/migrations');

  it('1. Verifies 10 sequential migration files exist in database/migrations', () => {
    assert.ok(fs.existsSync(dbMigrationsDir), 'database/migrations directory exists');
    const files = fs
      .readdirSync(dbMigrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    assert.equal(files.length, 10, 'Must have exactly 10 sequential migrations');
    assert.equal(files[0], '001_core_extensions_and_tenants.sql');
    assert.equal(files[1], '002_workforce_management.sql');
    assert.equal(files[2], '003_shifts_and_attendance.sql');
    assert.equal(files[3], '004_assets_and_inventory.sql');
    assert.equal(files[4], '005_clients_and_projects.sql');
    assert.equal(files[5], '006_work_orders_and_dispatch.sql');
    assert.equal(files[6], '007_expenses_and_invoices.sql');
    assert.equal(files[7], '008_audit_logs_and_triggers.sql');
    assert.equal(files[8], '009_comprehensive_rls_policies.sql');
    assert.equal(files[9], '010_storage_buckets_and_rls.sql');
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

  it('3. Guarantees multi-tenant isolation structure across all domain tables', () => {
    const files = fs.readdirSync(dbMigrationsDir).filter((f) => f.endsWith('.sql'));

    // Check that each tenant table includes organization_id and UUID primary key
    for (const file of files) {
      const content = fs.readFileSync(path.join(dbMigrationsDir, file), 'utf8');

      // Zero hardcoded credentials check
      assert.ok(!content.includes('password123'), `No hardcoded test passwords in ${file}`);
      assert.ok(!content.includes('eyJh'), `No JWT tokens in ${file}`);

      // Check create table statements
      const tableMatches = [
        ...content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_]+)\s*\(/gi)
      ];
      for (const match of tableMatches) {
        const tableName = match[1];
        if (tableName === '_schema_migrations') continue;

        // Verify UUID Primary Key
        assert.ok(
          content.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()') ||
            content.includes('id UUID PRIMARY KEY'),
          `Table ${tableName} in ${file} has UUID Primary Key`
        );

        // Verify organization_id in tenant-scoped tables
        if (tableName !== 'organizations' && tableName !== 'users_profiles') {
          assert.ok(
            content.includes('organization_id UUID NOT NULL REFERENCES public.organizations(id)'),
            `Table ${tableName} in ${file} must have organization_id FK to organizations`
          );
        }
      }
    }
  });

  it('4. Confirms Row Level Security (RLS) is enabled on all tables in 009', () => {
    const rlsFile = fs.readFileSync(
      path.join(dbMigrationsDir, '009_comprehensive_rls_policies.sql'),
      'utf8'
    );

    const requiredTables = [
      'organizations',
      'users_profiles',
      'organization_members',
      'workforce_members',
      'shift_schedules',
      'attendance_records',
      'assets',
      'inventory_items',
      'clients',
      'projects',
      'project_milestones',
      'service_requests',
      'work_orders',
      'work_order_checklists',
      'tasks',
      'expense_claims',
      'invoices',
      'invoice_items',
      'audit_logs'
    ];

    for (const table of requiredTables) {
      assert.ok(
        rlsFile.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
        `RLS must be enabled on table ${table}`
      );
    }

    assert.ok(rlsFile.includes('public.is_member_of('), 'Helper is_member_of must exist');
    assert.ok(rlsFile.includes('public.has_org_role('), 'Helper has_org_role must exist');
    assert.ok(rlsFile.includes('public.is_superadmin()'), 'Helper is_superadmin must exist');
  });

  it('5. Confirms Supabase CLI configuration and seed files', () => {
    const configPath = path.resolve('supabase/config.toml');
    assert.ok(fs.existsSync(configPath), 'supabase/config.toml must exist');
    const configContent = fs.readFileSync(configPath, 'utf8');
    assert.ok(configContent.includes('project_id = "opspilot"'), 'project_id must be opspilot');
    assert.ok(configContent.includes('port = 54322'), 'db port must be 54322');

    const seedPath = path.resolve('supabase/seed.sql');
    assert.ok(fs.existsSync(seedPath), 'supabase/seed.sql must exist');
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    assert.ok(seedContent.includes('Acme Logistics Global'), 'Seed data contains Acme Logistics');
    assert.ok(
      seedContent.includes('Apex Field Services'),
      'Seed data contains Apex Field Services'
    );
  });
});
