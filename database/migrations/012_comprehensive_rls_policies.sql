-- OpsPilot PostgreSQL Schema Migration: 012_comprehensive_rls_policies.sql
-- Description: Production-Oriented Multi-Tenant Isolation, Fine-Grained Role-Based Access Control,
--              Anti-Tamper Triggers, Anti-Escalation Guards, and Row Level Security (RLS) Policies

-- =====================================================================
-- 1. Helper Security Definer Functions with Safe Search Paths
-- =====================================================================

-- 1.1 Super Admin Check
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;

-- 1.2 Tenant Active Membership Check
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_member_of(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of(UUID) TO authenticated, service_role;

-- 1.3 Tenant Role Discovery
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    found_role TEXT;
BEGIN
    SELECT role INTO found_role
    FROM public.organization_memberships 
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND status = 'active'
    LIMIT 1;
    RETURN found_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_org_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_role(UUID) TO authenticated, service_role;

-- 1.4 Tenant Role Membership Check
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.has_org_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, TEXT[]) TO authenticated, service_role;

-- 1.5 Fine-Grained Permission Check
CREATE OR REPLACE FUNCTION public.has_org_permission(org_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Superadmins bypass tenant permission checks
    IF public.is_superadmin() THEN
        RETURN true;
    END IF;

    -- Tenant Owners possess all permissions
    IF public.has_org_role(org_id, ARRAY['owner']) THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.organization_memberships om
        JOIN public.role_permissions rp ON rp.role_id = om.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE om.organization_id = org_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
          AND p.name = required_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.has_org_permission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_permission(UUID, TEXT) TO authenticated, service_role;

-- 1.6 Customer Identity Resolution
CREATE OR REPLACE FUNCTION public.get_customer_id(org_id UUID)
RETURNS UUID AS $$
DECLARE
    cust_id UUID;
BEGIN
    SELECT c.id INTO cust_id
    FROM public.customers c
    WHERE c.organization_id = org_id
      AND (
          c.user_id = auth.uid() 
          OR c.email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
      )
      AND c.deleted_at IS NULL
    LIMIT 1;

    RETURN cust_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_customer_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_id(UUID) TO authenticated, service_role;

-- 1.7 Workforce Member Identity Resolution
CREATE OR REPLACE FUNCTION public.get_workforce_member_id(org_id UUID)
RETURNS UUID AS $$
DECLARE
    wf_id UUID;
BEGIN
    SELECT wm.id INTO wf_id
    FROM public.workforce_members wm
    WHERE wm.organization_id = org_id
      AND (
          wm.user_id = auth.uid()
          OR wm.email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
      )
      AND wm.deleted_at IS NULL
    LIMIT 1;

    RETURN wf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_workforce_member_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workforce_member_id(UUID) TO authenticated, service_role;

-- Ensure customers table has optional user_id link for direct customer account association
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- =====================================================================
-- 2. Anti-Tamper & Anti-Privilege-Escalation Triggers
-- =====================================================================

-- 2.1 Prevent Super Admin Privilege Escalation on user_profiles
CREATE OR REPLACE FUNCTION public.prevent_superadmin_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_superadmin != OLD.is_superadmin THEN
        IF NOT public.is_superadmin() THEN
            RAISE EXCEPTION 'Privilege Escalation Blocked: Only superadmins can alter is_superadmin status.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_superadmin_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_superadmin_escalation
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_superadmin_escalation();

-- 2.2 Prevent Self-Role Escalation & Non-Owner Owner Creation on organization_memberships
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Block any user from changing their own role unless they are already a platform superadmin
    IF (auth.uid() = OLD.user_id OR auth.uid() = NEW.user_id) AND NEW.role != OLD.role THEN
        IF NOT public.is_superadmin() THEN
            RAISE EXCEPTION 'Privilege Escalation Blocked: Users cannot modify their own organization role.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Block non-owners from promoting anyone to owner or admin
    IF NEW.role IN ('owner', 'admin') AND OLD.role != NEW.role THEN
        IF NOT (public.has_org_role(OLD.organization_id, ARRAY['owner']) OR public.is_superadmin()) THEN
            RAISE EXCEPTION 'Authorization Blocked: Only existing organization owners can grant owner or admin roles.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.organization_memberships;
CREATE TRIGGER trg_prevent_self_role_escalation
    BEFORE UPDATE ON public.organization_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 2.3 Prevent Unauthorized Organization Reassignment across Tenant Boundaries
CREATE OR REPLACE FUNCTION public.prevent_organization_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Cross-Tenant Violation: Reassigning organization_id across tenant boundaries is strictly prohibited.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach organization reassignment prevention trigger to all tenant tables
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'departments', 'workforce_members', 'shift_schedules', 'attendance_records',
        'customers', 'suppliers', 'assets', 'inventory_items', 'stock_transactions',
        'projects', 'project_members', 'project_milestones', 'service_requests',
        'work_orders', 'work_order_checklists', 'tasks', 'task_assignments',
        'task_comments', 'task_attachments', 'expenses', 'expense_approvals',
        'invoices', 'invoice_items', 'payments', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_org_reassign_%I ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_prevent_org_reassign_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_organization_reassignment();',
            tbl, tbl
        );
    END LOOP;
END $$;

-- =====================================================================
-- 3. Enable RLS on All Public Domain Tables
-- =====================================================================
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

-- =====================================================================
-- 4. User Profiles & Organizations Policies
-- =====================================================================

-- User Profiles
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
    USING (id = auth.uid() OR public.is_superadmin())
    WITH CHECK (id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Organizations
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations"
    ON public.organizations FOR SELECT
    USING (
        (public.is_member_of(id) AND deleted_at IS NULL)
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

DROP POLICY IF EXISTS "Org Owners can delete organization" ON public.organizations;
CREATE POLICY "Org Owners can delete organization"
    ON public.organizations FOR DELETE
    USING (public.has_org_role(id, ARRAY['owner']) OR public.is_superadmin());

-- =====================================================================
-- 5. RBAC & Organization Memberships Policies
-- =====================================================================

-- Roles
DROP POLICY IF EXISTS "Members can view roles of own org" ON public.roles;
CREATE POLICY "Members can view roles of own org"
    ON public.roles FOR SELECT
    USING (organization_id IS NULL OR public.is_member_of(organization_id) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins can manage roles of own org" ON public.roles;
CREATE POLICY "Admins can manage roles of own org"
    ON public.roles FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- Permissions & Role Permissions
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

-- Organization Memberships
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

DROP POLICY IF EXISTS "Owners can remove members from org" ON public.organization_memberships;
CREATE POLICY "Owners can remove members from org"
    ON public.organization_memberships FOR DELETE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- =====================================================================
-- 6. Role-Aware Policies for Operations & Workforce
-- =====================================================================

-- 6.1 Departments
DROP POLICY IF EXISTS "Internal staff view departments" ON public.departments;
CREATE POLICY "Internal staff view departments"
    ON public.departments FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage departments" ON public.departments;
CREATE POLICY "Managers manage departments"
    ON public.departments FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- 6.2 Workforce Members
DROP POLICY IF EXISTS "Internal staff view workforce" ON public.workforce_members;
CREATE POLICY "Internal staff view workforce"
    ON public.workforce_members FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage workforce" ON public.workforce_members;
CREATE POLICY "Managers manage workforce"
    ON public.workforce_members FOR INSERT
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Managers update workforce" ON public.workforce_members;
CREATE POLICY "Managers update workforce"
    ON public.workforce_members FOR UPDATE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins delete workforce" ON public.workforce_members;
CREATE POLICY "Admins delete workforce"
    ON public.workforce_members FOR DELETE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- 6.3 Shift Schedules & Attendance Records
DROP POLICY IF EXISTS "Staff view own or managed shifts" ON public.shift_schedules;
CREATE POLICY "Staff view own or managed shifts"
    ON public.shift_schedules FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            workforce_member_id = public.get_workforce_member_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Managers manage shift schedules" ON public.shift_schedules;
CREATE POLICY "Managers manage shift schedules"
    ON public.shift_schedules FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Staff view own or managed attendance" ON public.attendance_records;
CREATE POLICY "Staff view own or managed attendance"
    ON public.attendance_records FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            workforce_member_id = public.get_workforce_member_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Staff record own attendance" ON public.attendance_records;
CREATE POLICY "Staff record own attendance"
    ON public.attendance_records FOR INSERT
    WITH CHECK (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            workforce_member_id = public.get_workforce_member_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Managers update attendance" ON public.attendance_records;
CREATE POLICY "Managers update attendance"
    ON public.attendance_records FOR UPDATE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- =====================================================================
-- 7. Role-Aware Policies for Customers & Suppliers
-- =====================================================================

-- 7.1 Customers
DROP POLICY IF EXISTS "View customers policy" ON public.customers;
CREATE POLICY "View customers policy"
    ON public.customers FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            NOT public.has_org_role(organization_id, ARRAY['customer']) OR
            id = public.get_customer_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Managers manage customers" ON public.customers;
CREATE POLICY "Managers manage customers"
    ON public.customers FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- 7.2 Suppliers
DROP POLICY IF EXISTS "Internal staff view suppliers" ON public.suppliers;
CREATE POLICY "Internal staff view suppliers"
    ON public.suppliers FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage suppliers" ON public.suppliers;
CREATE POLICY "Managers manage suppliers"
    ON public.suppliers FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- =====================================================================
-- 8. Role-Aware Policies for Assets & Inventory
-- =====================================================================

-- 8.1 Assets
DROP POLICY IF EXISTS "Internal staff view assets" ON public.assets;
CREATE POLICY "Internal staff view assets"
    ON public.assets FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage assets" ON public.assets;
CREATE POLICY "Managers manage assets"
    ON public.assets FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- 8.2 Inventory Items
DROP POLICY IF EXISTS "Internal staff view inventory" ON public.inventory_items;
CREATE POLICY "Internal staff view inventory"
    ON public.inventory_items FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage inventory" ON public.inventory_items;
CREATE POLICY "Managers manage inventory"
    ON public.inventory_items FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- 8.3 Stock Transactions (Immutable Audit Trail)
DROP POLICY IF EXISTS "Internal staff view stock transactions" ON public.stock_transactions;
CREATE POLICY "Internal staff view stock transactions"
    ON public.stock_transactions FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers insert stock transactions" ON public.stock_transactions;
CREATE POLICY "Managers insert stock transactions"
    ON public.stock_transactions FOR INSERT
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- =====================================================================
-- 9. Projects, Tasks & Collaboration
-- =====================================================================

-- 9.1 Projects & Milestones
DROP POLICY IF EXISTS "Internal staff view projects" ON public.projects;
CREATE POLICY "Internal staff view projects"
    ON public.projects FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage projects" ON public.projects;
CREATE POLICY "Managers manage projects"
    ON public.projects FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Internal staff view project milestones" ON public.project_milestones;
CREATE POLICY "Internal staff view project milestones"
    ON public.project_milestones FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage project milestones" ON public.project_milestones;
CREATE POLICY "Managers manage project milestones"
    ON public.project_milestones FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Internal staff view project members" ON public.project_members;
CREATE POLICY "Internal staff view project members"
    ON public.project_members FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage project members" ON public.project_members;
CREATE POLICY "Managers manage project members"
    ON public.project_members FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- 9.2 Tasks, Assignments, Comments & Attachments
DROP POLICY IF EXISTS "Internal staff view tasks" ON public.tasks;
CREATE POLICY "Internal staff view tasks"
    ON public.tasks FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Internal staff create tasks" ON public.tasks;
CREATE POLICY "Internal staff create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Internal staff update tasks" ON public.tasks;
CREATE POLICY "Internal staff update tasks"
    ON public.tasks FOR UPDATE
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    )
    WITH CHECK (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers delete tasks" ON public.tasks;
CREATE POLICY "Managers delete tasks"
    ON public.tasks FOR DELETE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- Task Assignments
DROP POLICY IF EXISTS "Internal staff view task assignments" ON public.task_assignments;
CREATE POLICY "Internal staff view task assignments"
    ON public.task_assignments FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Managers manage task assignments" ON public.task_assignments;
CREATE POLICY "Managers manage task assignments"
    ON public.task_assignments FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- Task Comments
DROP POLICY IF EXISTS "Internal staff view task comments" ON public.task_comments;
CREATE POLICY "Internal staff view task comments"
    ON public.task_comments FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Internal staff post task comments" ON public.task_comments;
CREATE POLICY "Internal staff post task comments"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

-- Task Attachments
DROP POLICY IF EXISTS "Internal staff view task attachments" ON public.task_attachments;
CREATE POLICY "Internal staff view task attachments"
    ON public.task_attachments FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Internal staff upload task attachments" ON public.task_attachments;
CREATE POLICY "Internal staff upload task attachments"
    ON public.task_attachments FOR INSERT
    WITH CHECK (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

-- =====================================================================
-- 10. Service Requests & Work Orders
-- =====================================================================

-- 10.1 Service Requests
DROP POLICY IF EXISTS "View service requests policy" ON public.service_requests;
CREATE POLICY "View service requests policy"
    ON public.service_requests FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            NOT public.has_org_role(organization_id, ARRAY['customer']) OR
            customer_id = public.get_customer_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Create service requests policy" ON public.service_requests;
CREATE POLICY "Create service requests policy"
    ON public.service_requests FOR INSERT
    WITH CHECK (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            NOT public.has_org_role(organization_id, ARRAY['customer']) OR
            customer_id = public.get_customer_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Managers update service requests" ON public.service_requests;
CREATE POLICY "Managers update service requests"
    ON public.service_requests FOR UPDATE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins delete service requests" ON public.service_requests;
CREATE POLICY "Admins delete service requests"
    ON public.service_requests FOR DELETE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- 10.2 Work Orders & Checklists
DROP POLICY IF EXISTS "View work orders policy" ON public.work_orders;
CREATE POLICY "View work orders policy"
    ON public.work_orders FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            NOT public.has_org_role(organization_id, ARRAY['customer']) OR
            customer_id = public.get_customer_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Managers create work orders" ON public.work_orders;
CREATE POLICY "Managers create work orders"
    ON public.work_orders FOR INSERT
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Staff update work orders" ON public.work_orders;
CREATE POLICY "Staff update work orders"
    ON public.work_orders FOR UPDATE
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            assigned_to = public.get_workforce_member_id(organization_id)
        ))
    )
    WITH CHECK (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            assigned_to = public.get_workforce_member_id(organization_id)
        ))
    );

DROP POLICY IF EXISTS "Admins delete work orders" ON public.work_orders;
CREATE POLICY "Admins delete work orders"
    ON public.work_orders FOR DELETE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Internal staff view checklists" ON public.work_order_checklists;
CREATE POLICY "Internal staff view checklists"
    ON public.work_order_checklists FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Staff update checklists" ON public.work_order_checklists;
CREATE POLICY "Staff update checklists"
    ON public.work_order_checklists FOR ALL
    USING (
        (public.is_member_of(organization_id) AND NOT public.has_org_role(organization_id, ARRAY['customer']))
        OR public.is_superadmin()
    );

-- =====================================================================
-- 11. Expenses & Expense Approvals
-- =====================================================================

-- 11.1 Expenses
DROP POLICY IF EXISTS "View expenses policy" ON public.expenses;
CREATE POLICY "View expenses policy"
    ON public.expenses FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            (
                public.has_org_role(organization_id, ARRAY['employee', 'member']) AND
                workforce_member_id = public.get_workforce_member_id(organization_id)
            )
        ))
    );

DROP POLICY IF EXISTS "Staff submit own expenses" ON public.expenses;
CREATE POLICY "Staff submit own expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            (
                public.has_org_role(organization_id, ARRAY['employee', 'member']) AND
                workforce_member_id = public.get_workforce_member_id(organization_id)
            )
        ))
    );

DROP POLICY IF EXISTS "Staff update own pending expenses" ON public.expenses;
CREATE POLICY "Staff update own pending expenses"
    ON public.expenses FOR UPDATE
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            (
                public.has_org_role(organization_id, ARRAY['employee', 'member']) AND
                workforce_member_id = public.get_workforce_member_id(organization_id) AND
                status = 'pending'
            )
        ))
    )
    WITH CHECK (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            (
                public.has_org_role(organization_id, ARRAY['employee', 'member']) AND
                workforce_member_id = public.get_workforce_member_id(organization_id) AND
                status = 'pending'
            )
        ))
    );

-- 11.2 Expense Approvals
DROP POLICY IF EXISTS "Managers view expense approvals" ON public.expense_approvals;
CREATE POLICY "Managers view expense approvals"
    ON public.expense_approvals FOR SELECT
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

DROP POLICY IF EXISTS "Managers submit expense approvals" ON public.expense_approvals;
CREATE POLICY "Managers submit expense approvals"
    ON public.expense_approvals FOR INSERT
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- =====================================================================
-- 12. Invoices, Line Items & Payments
-- =====================================================================

-- 12.1 Invoices
DROP POLICY IF EXISTS "View invoices policy" ON public.invoices;
CREATE POLICY "View invoices policy"
    ON public.invoices FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            (
                public.has_org_role(organization_id, ARRAY['customer']) AND
                customer_id = public.get_customer_id(organization_id)
            )
        ))
    );

DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;
CREATE POLICY "Admins manage invoices"
    ON public.invoices FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- 12.2 Invoice Items
DROP POLICY IF EXISTS "View invoice items policy" ON public.invoice_items;
CREATE POLICY "View invoice items policy"
    ON public.invoice_items FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            invoice_id IN (
                SELECT id FROM public.invoices 
                WHERE organization_id = invoice_items.organization_id 
                  AND customer_id = public.get_customer_id(organization_id)
            )
        ))
    );

DROP POLICY IF EXISTS "Admins manage invoice items" ON public.invoice_items;
CREATE POLICY "Admins manage invoice items"
    ON public.invoice_items FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- 12.3 Payments
DROP POLICY IF EXISTS "View payments policy" ON public.payments;
CREATE POLICY "View payments policy"
    ON public.payments FOR SELECT
    USING (
        public.is_superadmin() OR
        (public.is_member_of(organization_id) AND (
            public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR
            invoice_id IN (
                SELECT id FROM public.invoices 
                WHERE organization_id = payments.organization_id 
                  AND customer_id = public.get_customer_id(organization_id)
            )
        ))
    );

DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments"
    ON public.payments FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) OR public.is_superadmin());

-- =====================================================================
-- 13. Notifications & Audit Logs
-- =====================================================================

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid() OR public.is_superadmin())
    WITH CHECK (user_id = auth.uid() OR public.is_superadmin());

-- Audit Logs
DROP POLICY IF EXISTS "Managers view audit logs" ON public.audit_logs;
CREATE POLICY "Managers view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']))
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Authenticated users insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());
