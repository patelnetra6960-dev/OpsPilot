-- OpsPilot PostgreSQL Schema Migration: 009_comprehensive_rls_policies.sql
-- Description: Comprehensive Row Level Security (RLS) Multi-Tenant Isolation Policies

-- 1. Helper Security Definer Functions
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.organization_members 
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
        FROM public.organization_members 
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
        FROM public.users_profiles 
        WHERE id = auth.uid() 
          AND is_superadmin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enable RLS on All Public Domain Tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. Users Profiles Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profiles;
CREATE POLICY "Users can view own profile"
    ON public.users_profiles FOR SELECT
    USING (id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "Users can view profiles of co-members" ON public.users_profiles;
CREATE POLICY "Users can view profiles of co-members"
    ON public.users_profiles FOR SELECT
    USING (
        id IN (
            SELECT om2.user_id 
            FROM public.organization_members om1
            JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.user_id = auth.uid() AND om1.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profiles;
CREATE POLICY "Users can update own profile"
    ON public.users_profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profiles;
CREATE POLICY "Users can insert own profile"
    ON public.users_profiles FOR INSERT
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
            FROM public.organization_members 
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
-- 5. Organization Members Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view co-members of same org" ON public.organization_members;
CREATE POLICY "Members can view co-members of same org"
    ON public.organization_members FOR SELECT
    USING (public.is_member_of(organization_id) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins can add members to org" ON public.organization_members;
CREATE POLICY "Admins can add members to org"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['owner', 'admin'])
        OR user_id = auth.uid()
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Admins can update org members" ON public.organization_members;
CREATE POLICY "Admins can update org members"
    ON public.organization_members FOR UPDATE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- ---------------------------------------------------------------------
-- 6. Universal Tenant-Isolated Entity Policies (Workforce, Shifts, Assets, etc.)
-- ---------------------------------------------------------------------

-- Macro helper for standard tenant tables
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'workforce_members', 'shift_schedules', 'attendance_records',
        'assets', 'inventory_items', 'clients', 'projects',
        'project_milestones', 'service_requests', 'work_orders',
        'work_order_checklists', 'tasks', 'expense_claims',
        'invoices', 'invoice_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Select Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Isolation Select on %I" ON public.%I FOR SELECT USING (public.is_member_of(organization_id) OR public.is_superadmin());',
            tbl, tbl
        );

        -- Insert Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Insert on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Isolation Insert on %I" ON public.%I FOR INSERT WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());',
            tbl, tbl
        );

        -- Update Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Update on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Isolation Update on %I" ON public.%I FOR UPDATE USING (public.is_member_of(organization_id) OR public.is_superadmin()) WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());',
            tbl, tbl
        );

        -- Delete Policy (Soft-delete or Admin hard delete)
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Delete on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Tenant Isolation Delete on %I" ON public.%I FOR DELETE USING (public.has_org_role(organization_id, ARRAY[''owner'', ''admin'']) OR public.is_superadmin());',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7. Audit Logs RLS Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant members can view own org audit logs" ON public.audit_logs;
CREATE POLICY "Tenant members can view own org audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());
