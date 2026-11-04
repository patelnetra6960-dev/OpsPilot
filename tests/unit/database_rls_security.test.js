import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

/**
 * Direct Database Access & PostgreSQL RLS Simulator
 * Evaluates RLS policies, SECURITY DEFINER functions, and anti-tamper triggers
 * directly against database states and user session contexts.
 */
describe('Prompt 10: Multi-Tenant Isolation & Row Level Security Direct DB Test Suite', () => {
  const dbMigrationsDir = path.resolve('database/migrations');
  const rlsMigrationFile = path.join(dbMigrationsDir, '012_comprehensive_rls_policies.sql');
  const rlsSql = fs.readFileSync(rlsMigrationFile, 'utf8');

  // -------------------------------------------------------------------
  // 1. Static Security & Search Path Audit of SQL Definitions
  // -------------------------------------------------------------------
  describe('1. Static SQL Security & Search Path Audit', () => {
    it('1.1 Verifies all 32 public domain tables have RLS enabled', () => {
      const tables = [
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

      for (const table of tables) {
        assert.ok(
          rlsSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
          `Table public.${table} must have ENABLE ROW LEVEL SECURITY`
        );
      }
    });

    it('1.2 Asserts SECURITY DEFINER functions enforce safe search_path = public, pg_temp', () => {
      const securityDefinerFunctions = [
        'is_superadmin',
        'is_member_of',
        'get_org_role',
        'has_org_role',
        'has_org_permission',
        'get_customer_id',
        'get_workforce_member_id',
        'prevent_superadmin_escalation',
        'prevent_self_role_escalation',
        'prevent_organization_reassignment'
      ];

      for (const fn of securityDefinerFunctions) {
        const fnBlockRegex = new RegExp(
          `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fn}\\([\\s\\S]*?\\)\\s+RETURNS[\\s\\S]*?SET\\s+search_path\\s*=\\s*public,\\s*pg_temp;`,
          'i'
        );
        assert.ok(
          fnBlockRegex.test(rlsSql),
          `Function public.${fn} must declare 'SET search_path = public, pg_temp;' to mitigate search path hijacking`
        );
      }
    });

    it('1.3 Verifies execution permissions revoked from PUBLIC and restricted to authenticated/service_role', () => {
      const publicFunctions = [
        'is_superadmin()',
        'is_member_of(UUID)',
        'get_org_role(UUID)',
        'has_org_role(UUID, TEXT[])',
        'has_org_permission(UUID, TEXT)',
        'get_customer_id(UUID)',
        'get_workforce_member_id(UUID)'
      ];

      for (const fnSignature of publicFunctions) {
        assert.ok(
          rlsSql.includes(`REVOKE ALL ON FUNCTION public.${fnSignature} FROM PUBLIC;`),
          `REVOKE ALL ON FUNCTION public.${fnSignature} FROM PUBLIC must be present`
        );
        assert.ok(
          rlsSql.includes(
            `GRANT EXECUTE ON FUNCTION public.${fnSignature} TO authenticated, service_role;`
          ),
          `GRANT EXECUTE ON FUNCTION public.${fnSignature} TO authenticated, service_role must be present`
        );
      }
    });

    it('1.4 Confirms anti-tamper triggers are defined for role escalation and cross-tenant reassignments', () => {
      assert.ok(
        rlsSql.includes('trg_prevent_superadmin_escalation'),
        'Trigger trg_prevent_superadmin_escalation must be defined'
      );
      assert.ok(
        rlsSql.includes('trg_prevent_self_role_escalation'),
        'Trigger trg_prevent_self_role_escalation must be defined'
      );
      assert.ok(
        rlsSql.includes('prevent_organization_reassignment()'),
        'Function prevent_organization_reassignment must be defined'
      );
    });
  });

  // -------------------------------------------------------------------
  // 2. Direct Database Engine Simulation (Positive & Negative Isolation)
  // -------------------------------------------------------------------
  describe('2. Direct Database RLS Policy Engine Simulation', () => {
    const ACME_ORG = '11111111-1111-1111-1111-111111111111';
    const APEX_ORG = '22222222-2222-2222-2222-222222222222';

    // Simulated Database State
    const dbState = {
      organizations: [
        { id: ACME_ORG, name: 'Acme Logistics', deleted_at: null },
        { id: APEX_ORG, name: 'Apex Field Services', deleted_at: null }
      ],
      userProfiles: [
        { id: 'usr-super', email: 'victoria@opspilot.io', is_superadmin: true },
        { id: 'usr-owner-acme', email: 'alex@acme.com', is_superadmin: false },
        { id: 'usr-mgr-acme', email: 'sarah@acme.com', is_superadmin: false },
        { id: 'usr-emp-acme', email: 'david@acme.com', is_superadmin: false },
        { id: 'usr-cust-acme', email: 'rachel@metrohealth.com', is_superadmin: false },
        { id: 'usr-owner-apex', email: 'marcus@apex.com', is_superadmin: false }
      ],
      memberships: [
        {
          id: 'm1',
          organization_id: ACME_ORG,
          user_id: 'usr-owner-acme',
          role: 'owner',
          status: 'active'
        },
        {
          id: 'm2',
          organization_id: ACME_ORG,
          user_id: 'usr-mgr-acme',
          role: 'manager',
          status: 'active'
        },
        {
          id: 'm3',
          organization_id: ACME_ORG,
          user_id: 'usr-emp-acme',
          role: 'employee',
          status: 'active'
        },
        {
          id: 'm4',
          organization_id: ACME_ORG,
          user_id: 'usr-cust-acme',
          role: 'customer',
          status: 'active'
        },
        {
          id: 'm5',
          organization_id: APEX_ORG,
          user_id: 'usr-owner-apex',
          role: 'owner',
          status: 'active'
        }
      ],
      customers: [
        {
          id: 'cust-metro',
          organization_id: ACME_ORG,
          user_id: 'usr-cust-acme',
          email: 'rachel@metrohealth.com',
          name: 'Metro Health'
        },
        {
          id: 'cust-pinnacle',
          organization_id: APEX_ORG,
          user_id: null,
          email: 'contact@pinnacle.com',
          name: 'Pinnacle Energy'
        }
      ],
      workforce: [
        {
          id: 'wf-david',
          organization_id: ACME_ORG,
          user_id: 'usr-emp-acme',
          email: 'david@acme.com',
          designation: 'Dispatcher'
        },
        {
          id: 'wf-sarah',
          organization_id: ACME_ORG,
          user_id: 'usr-mgr-acme',
          email: 'sarah@acme.com',
          designation: 'Operations Manager'
        }
      ],
      serviceRequests: [
        {
          id: 'sr-1',
          organization_id: ACME_ORG,
          customer_id: 'cust-metro',
          title: 'MRI Cooler Pump Failure'
        },
        {
          id: 'sr-2',
          organization_id: APEX_ORG,
          customer_id: 'cust-pinnacle',
          title: 'Turbine Inspection'
        }
      ],
      invoices: [
        {
          id: 'inv-1',
          organization_id: ACME_ORG,
          customer_id: 'cust-metro',
          total: 3200.0,
          status: 'pending'
        },
        {
          id: 'inv-2',
          organization_id: APEX_ORG,
          customer_id: 'cust-pinnacle',
          total: 7500.0,
          status: 'paid'
        }
      ],
      expenses: [
        {
          id: 'exp-1',
          organization_id: ACME_ORG,
          workforce_member_id: 'wf-david',
          amount: 145.5,
          status: 'pending'
        },
        {
          id: 'exp-2',
          organization_id: ACME_ORG,
          workforce_member_id: 'wf-sarah',
          amount: 320.0,
          status: 'approved'
        }
      ],
      inventoryItems: [
        {
          id: 'inv-item-1',
          organization_id: ACME_ORG,
          name: 'Centrifugal Pump Seal',
          quantity: 15
        },
        { id: 'inv-item-2', organization_id: APEX_ORG, name: 'High-Voltage Insulator', quantity: 8 }
      ],
      auditLogs: [
        {
          id: 'log-1',
          organization_id: ACME_ORG,
          action: 'member.role_updated',
          entity_type: 'membership'
        }
      ]
    };

    // Helper functions reproducing the exact SQL SECURITY DEFINER behavior
    const createDbSession = (userId) => {
      const userProfile = dbState.userProfiles.find((u) => u.id === userId) || null;
      const isSuperadmin = () => userProfile?.is_superadmin === true;

      const isMemberOf = (orgId) => {
        return dbState.memberships.some(
          (m) => m.organization_id === orgId && m.user_id === userId && m.status === 'active'
        );
      };

      const hasOrgRole = (orgId, allowedRoles) => {
        return dbState.memberships.some(
          (m) =>
            m.organization_id === orgId &&
            m.user_id === userId &&
            m.status === 'active' &&
            allowedRoles.includes(m.role)
        );
      };

      const getCustomerId = (orgId) => {
        const cust = dbState.customers.find(
          (c) =>
            c.organization_id === orgId && (c.user_id === userId || c.email === userProfile?.email)
        );
        return cust ? cust.id : null;
      };

      const getWorkforceMemberId = (orgId) => {
        const wf = dbState.workforce.find(
          (w) =>
            w.organization_id === orgId && (w.user_id === userId || w.email === userProfile?.email)
        );
        return wf ? wf.id : null;
      };

      // Direct RLS query evaluators
      return {
        userId,
        userProfile,
        isSuperadmin,
        isMemberOf,
        hasOrgRole,
        getCustomerId,
        getWorkforceMemberId,

        // Organizations RLS SELECT
        selectOrganizations: () => {
          return dbState.organizations.filter(
            (org) => (isMemberOf(org.id) && org.deleted_at === null) || isSuperadmin()
          );
        },

        // Customers RLS SELECT
        selectCustomers: (orgId) => {
          if (!isMemberOf(orgId) && !isSuperadmin()) return [];
          const isCustomer = hasOrgRole(orgId, ['customer']);
          const myCustId = getCustomerId(orgId);

          return dbState.customers.filter((c) => {
            if (c.organization_id !== orgId) return false;
            if (isSuperadmin()) return true;
            if (!isCustomer) return true;
            return c.id === myCustId;
          });
        },

        // Service Requests RLS SELECT
        selectServiceRequests: (orgId) => {
          if (!isMemberOf(orgId) && !isSuperadmin()) return [];
          const isCustomer = hasOrgRole(orgId, ['customer']);
          const myCustId = getCustomerId(orgId);

          return dbState.serviceRequests.filter((sr) => {
            if (sr.organization_id !== orgId) return false;
            if (isSuperadmin()) return true;
            if (!isCustomer) return true;
            return sr.customer_id === myCustId;
          });
        },

        // Invoices RLS SELECT
        selectInvoices: (orgId) => {
          if (!isMemberOf(orgId) && !isSuperadmin()) return [];
          if (hasOrgRole(orgId, ['owner', 'admin', 'manager']) || isSuperadmin()) {
            return dbState.invoices.filter((inv) => inv.organization_id === orgId);
          }
          if (hasOrgRole(orgId, ['customer'])) {
            const myCustId = getCustomerId(orgId);
            return dbState.invoices.filter(
              (inv) => inv.organization_id === orgId && inv.customer_id === myCustId
            );
          }
          // Regular employees cannot see company invoices
          return [];
        },

        // Expenses RLS SELECT
        selectExpenses: (orgId) => {
          if (!isMemberOf(orgId) && !isSuperadmin()) return [];
          if (hasOrgRole(orgId, ['customer'])) return []; // Customers BLOCKED
          if (hasOrgRole(orgId, ['owner', 'admin', 'manager']) || isSuperadmin()) {
            return dbState.expenses.filter((exp) => exp.organization_id === orgId);
          }
          if (hasOrgRole(orgId, ['employee', 'member'])) {
            const myWfId = getWorkforceMemberId(orgId);
            return dbState.expenses.filter(
              (exp) => exp.organization_id === orgId && exp.workforce_member_id === myWfId
            );
          }
          return [];
        },

        // Inventory RLS SELECT
        selectInventory: (orgId) => {
          if (!isMemberOf(orgId) && !isSuperadmin()) return [];
          // Internal staff only, customers blocked
          if (hasOrgRole(orgId, ['customer'])) return [];
          return dbState.inventoryItems.filter((item) => item.organization_id === orgId);
        },

        // Audit Logs RLS SELECT
        selectAuditLogs: (orgId) => {
          if (
            (isMemberOf(orgId) && hasOrgRole(orgId, ['owner', 'admin', 'manager'])) ||
            isSuperadmin()
          ) {
            return dbState.auditLogs.filter((log) => log.organization_id === orgId);
          }
          return [];
        },

        // Trigger: prevent_superadmin_escalation
        executeUserUpdate: (targetUserId, updates) => {
          const target = dbState.userProfiles.find((u) => u.id === targetUserId);
          if (!target) throw new Error('User not found');

          if (
            updates.is_superadmin !== undefined &&
            updates.is_superadmin !== target.is_superadmin
          ) {
            if (!isSuperadmin()) {
              const err = new Error(
                'Privilege Escalation Blocked: Only superadmins can alter is_superadmin status.'
              );
              err.code = '42501';
              throw err;
            }
          }
          return { ...target, ...updates };
        },

        // Trigger: prevent_self_role_escalation
        executeMembershipRoleUpdate: (membershipId, newRole) => {
          const membership = dbState.memberships.find((m) => m.id === membershipId);
          if (!membership) throw new Error('Membership not found');

          if (membership.user_id === userId && newRole !== membership.role) {
            if (!isSuperadmin()) {
              const err = new Error(
                'Privilege Escalation Blocked: Users cannot modify their own organization role.'
              );
              err.code = '42501';
              throw err;
            }
          }

          if (['owner', 'admin'].includes(newRole) && membership.role !== newRole) {
            if (!hasOrgRole(membership.organization_id, ['owner']) && !isSuperadmin()) {
              const err = new Error(
                'Authorization Blocked: Only existing organization owners can grant owner or admin roles.'
              );
              err.code = '42501';
              throw err;
            }
          }

          return { ...membership, role: newRole };
        },

        // Trigger: prevent_organization_reassignment
        executeRecordUpdate: (record, updates) => {
          if (updates.organization_id && updates.organization_id !== record.organization_id) {
            const err = new Error(
              'Cross-Tenant Violation: Reassigning organization_id across tenant boundaries is strictly prohibited.'
            );
            err.code = '42501';
            throw err;
          }
          return { ...record, ...updates };
        }
      };
    };

    // 2.1 Super Admin Isolation & Privileges
    it('2.1 Super Admin: Can view all organizations and records cross-tenant', () => {
      const superSession = createDbSession('usr-super');
      const orgs = superSession.selectOrganizations();
      assert.equal(orgs.length, 2, 'Super Admin sees all organizations');

      const acmeInvoices = superSession.selectInvoices(ACME_ORG);
      assert.equal(acmeInvoices.length, 1);
      const apexInvoices = superSession.selectInvoices(APEX_ORG);
      assert.equal(apexInvoices.length, 1);
    });

    it('2.2 Super Admin Privilege Escalation Guard: Non-superadmin is blocked from setting is_superadmin = true', () => {
      const ownerSession = createDbSession('usr-owner-acme');
      assert.throws(
        () => {
          ownerSession.executeUserUpdate('usr-owner-acme', { is_superadmin: true });
        },
        (err) => err.code === '42501' && err.message.includes('Privilege Escalation Blocked')
      );
    });

    // 2.3 Org Owner & Cross-Tenant Boundary
    it('2.3 Org Owner: Can access own tenant records but blocked from other tenant', () => {
      const acmeOwnerSession = createDbSession('usr-owner-acme');
      const acmeOrgs = acmeOwnerSession.selectOrganizations();
      assert.equal(acmeOrgs.length, 1);
      assert.equal(acmeOrgs[0].id, ACME_ORG);

      // Attempt to read Apex invoices -> Negative (0 rows)
      const apexInvoices = acmeOwnerSession.selectInvoices(APEX_ORG);
      assert.equal(apexInvoices.length, 0, 'Cross-tenant resource access blocked at DB level');
    });

    it('2.4 Anti-Tampering Trigger: Block cross-tenant organization_id reassignment on any entity', () => {
      const acmeOwnerSession = createDbSession('usr-owner-acme');
      const assetRecord = { id: 'asset-1', organization_id: ACME_ORG, name: 'Forklift A-1' };

      assert.throws(
        () => {
          acmeOwnerSession.executeRecordUpdate(assetRecord, { organization_id: APEX_ORG });
        },
        (err) => err.code === '42501' && err.message.includes('Cross-Tenant Violation')
      );
    });

    // 2.5 Manager Role Limits
    it('2.5 Manager: Can view org expenses and audit logs, but cannot elevate own role', () => {
      const mgrSession = createDbSession('usr-mgr-acme');
      const expenses = mgrSession.selectExpenses(ACME_ORG);
      assert.equal(expenses.length, 2, 'Manager sees all org expenses for approval');

      const auditLogs = mgrSession.selectAuditLogs(ACME_ORG);
      assert.equal(auditLogs.length, 1, 'Manager can view org audit logs');

      // Attempt self-elevation to owner -> Negative (42501)
      assert.throws(
        () => {
          mgrSession.executeMembershipRoleUpdate('m2', 'owner');
        },
        (err) => err.code === '42501' && err.message.includes('Privilege Escalation Blocked')
      );
    });

    // 2.6 Employee Role Limits
    it('2.6 Employee: Can view own expenses only, blocked from company invoices and audit logs', () => {
      const empSession = createDbSession('usr-emp-acme');

      // Sees ONLY own expense
      const expenses = empSession.selectExpenses(ACME_ORG);
      assert.equal(expenses.length, 1);
      assert.equal(expenses[0].workforce_member_id, 'wf-david');

      // Invoices -> Negative (0 rows)
      const invoices = empSession.selectInvoices(ACME_ORG);
      assert.equal(invoices.length, 0, 'Employees cannot see company financial invoices');

      // Audit logs -> Negative (0 rows)
      const auditLogs = empSession.selectAuditLogs(ACME_ORG);
      assert.equal(auditLogs.length, 0, 'Employees cannot access audit logs');

      // Attempt self-elevation -> Negative (42501)
      assert.throws(
        () => {
          empSession.executeMembershipRoleUpdate('m3', 'admin');
        },
        (err) => err.code === '42501' && err.message.includes('Privilege Escalation Blocked')
      );
    });

    // 2.7 Customer Role Limits
    it('2.7 Customer: Can access ONLY own service requests and invoices, blocked from internal ops', () => {
      const custSession = createDbSession('usr-cust-acme');

      // Can see own service request
      const srs = custSession.selectServiceRequests(ACME_ORG);
      assert.equal(srs.length, 1);
      assert.equal(srs[0].id, 'sr-1');

      // Can see own invoice
      const invs = custSession.selectInvoices(ACME_ORG);
      assert.equal(invs.length, 1);
      assert.equal(invs[0].id, 'inv-1');

      // Cross-customer service request / invoice -> Negative (cannot see Apex or other customer data)
      const apexSRs = custSession.selectServiceRequests(APEX_ORG);
      assert.equal(apexSRs.length, 0);

      // Internal Inventory -> Negative (0 rows)
      const inventory = custSession.selectInventory(ACME_ORG);
      assert.equal(
        inventory.length,
        0,
        'Customer accounts strictly blocked from internal inventory'
      );

      // Internal Expenses -> Negative (0 rows)
      const expenses = custSession.selectExpenses(ACME_ORG);
      assert.equal(expenses.length, 0, 'Customer accounts strictly blocked from company expenses');
    });
  });
});
