-- OpsPilot PostgreSQL Schema Migration: 012_comprehensive_rls_policies.sql
-- Description: Comprehensive Row Level Security (RLS) Policies Across All Normalized Domain Tables

-- 1. Helper Security Definer Functions
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.organization_memberships 
        WHERE organization_id = org_id 
          AND user_id = auth.uid() 
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.organization_memberships 
        WHERE organization_id = org_id 
          AND user_id = auth.uid() 
          AND status = 'active'
          AND role = ANY(allowed_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
          AND is_superadmin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enable RLS on All Public Domain Tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. User Profiles Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "Users can view profiles of co-members" ON public.user_profiles;
CREATE POLICY "Users can view profiles of co-members"
    ON public.user_profiles FOR SELECT
    USING (
        id IN (
            SELECT om2.user_id 
            FROM public.organization_memberships om1
            JOIN public.organization_memberships om2 ON om1.organization_id = om2.organization_id
            WHERE om1.user_id = auth.uid() AND om1.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Organizations Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations"
    ON public.organizations FOR SELECT
    USING (
        (id IN (
            SELECT organization_id 
            FROM public.organization_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        ) AND deleted_at IS NULL)
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Authenticated users can create organization" ON public.organizations;
CREATE POLICY "Authenticated users can create organization"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Org Owners and Admins can update organization" ON public.organizations;
CREATE POLICY "Org Owners and Admins can update organization"
    ON public.organizations FOR UPDATE
    USING (public.has_org_role(id, ARRAY['owner', 'admin']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- ---------------------------------------------------------------------
-- 5. RBAC & Organization Memberships Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view roles of own org" ON public.roles;
CREATE POLICY "Members can view roles of own org"
    ON public.roles FOR SELECT
    USING (organization_id IS NULL OR public.is_member_of(organization_id) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins can manage roles of own org" ON public.roles;
CREATE POLICY "Admins can manage roles of own org"
    ON public.roles FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

DROP POLICY IF EXISTS "All authenticated users can view permissions" ON public.permissions;
CREATE POLICY "All authenticated users can view permissions"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "All authenticated users can view role_permissions" ON public.role_permissions;
CREATE POLICY "All authenticated users can view role_permissions"
    ON public.role_permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Members can view co-members of same org" ON public.organization_memberships;
CREATE POLICY "Members can view co-members of same org"
    ON public.organization_memberships FOR SELECT
    USING (public.is_member_of(organization_id) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins can add members to org" ON public.organization_memberships;
CREATE POLICY "Admins can add members to org"
    ON public.organization_memberships FOR INSERT
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['owner', 'admin'])
        OR user_id = auth.uid()
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Admins can update org members" ON public.organization_memberships;
CREATE POLICY "Admins can update org members"
    ON public.organization_memberships FOR UPDATE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- ---------------------------------------------------------------------
-- 6. Universal Tenant-Isolated Entity Policies (Dynamic Macro)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'departments', 'workforce_members', 'shift_schedules', 'attendance_records',
        'customers', 'suppliers', 'assets', 'inventory_items', 'stock_transactions',
        'projects', 'project_members', 'project_milestones', 'service_requests',
        'work_orders', 'work_order_checklists', 'tasks', 'task_assignments',
        'task_comments', 'task_attachments', 'expenses', 'expense_approvals',
        'invoices', 'invoice_items', 'payments'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Select Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Select on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Select on %I" ON public.%I FOR SELECT USING (public.is_member_of(organization_id) OR public.is_superadmin());',
            tbl, tbl
        );

        -- Insert Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Insert on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Insert on %I" ON public.%I FOR INSERT WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());',
            tbl, tbl
        );

        -- Update Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Update on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Update on %I" ON public.%I FOR UPDATE USING (public.is_member_of(organization_id) OR public.is_superadmin()) WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());',
            tbl, tbl
        );

        -- Delete Policy (Restricted to Tenant Owners / Admins)
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Delete on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Delete on %I" ON public.%I FOR DELETE USING (public.has_org_role(organization_id, ARRAY[''owner'', ''admin'']) OR public.is_superadmin());',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7. Notifications Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid() OR public.is_superadmin())
    WITH CHECK (user_id = auth.uid() OR public.is_superadmin());

-- ---------------------------------------------------------------------
-- 8. Audit Logs Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant managers can view own org audit logs" ON public.audit_logs;
CREATE POLICY "Tenant managers can view own org audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());
