-- OpsPilot PostgreSQL Schema Migration: 002_rls_policies.sql
-- Description: Row Level Security (RLS) Policies for Multi-Tenant Isolation

-- Enable RLS on all tenant-aware tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Helper Functions for Security Checks
-- ---------------------------------------------------------------------

-- Check if current authenticated user is an active member of an organization
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

-- Check if current authenticated user has an elevated role in the organization
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

-- Check if current user is superadmin
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

-- ---------------------------------------------------------------------
-- 1. Users Profiles Policies
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
            WHERE om1.user_id = auth.uid()
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
-- 2. Organizations Policies
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

DROP POLICY IF EXISTS "Authenticated users can create an organization" ON public.organizations;
CREATE POLICY "Authenticated users can create an organization"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Owners and Admins can update their organization" ON public.organizations;
CREATE POLICY "Owners and Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (public.has_org_role(id, ARRAY['owner', 'admin']) OR public.is_superadmin())
    WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']) OR public.is_superadmin());

-- ---------------------------------------------------------------------
-- 3. Organization Members Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view memberships in their organization" ON public.organization_members;
CREATE POLICY "Members can view memberships in their organization"
    ON public.organization_members FOR SELECT
    USING (
        public.is_member_of(organization_id) OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Owners and Admins can invite/add members" ON public.organization_members;
CREATE POLICY "Owners and Admins can invite/add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['owner', 'admin']) 
        OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id)
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Owners and Admins can update member roles and status" ON public.organization_members;
CREATE POLICY "Owners and Admins can update member roles and status"
    ON public.organization_members FOR UPDATE
    USING (
        public.has_org_role(organization_id, ARRAY['owner', 'admin']) 
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Owners and Admins can remove members" ON public.organization_members;
CREATE POLICY "Owners and Admins can remove members"
    ON public.organization_members FOR DELETE
    USING (
        public.has_org_role(organization_id, ARRAY['owner', 'admin']) 
        OR user_id = auth.uid()
        OR public.is_superadmin()
    );

-- ---------------------------------------------------------------------
-- 4. Workforce Members Policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view workforce in their organization" ON public.workforce_members;
CREATE POLICY "Members can view workforce in their organization"
    ON public.workforce_members FOR SELECT
    USING (
        (public.is_member_of(organization_id) AND deleted_at IS NULL) OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Admins and Managers can insert workforce members" ON public.workforce_members;
CREATE POLICY "Admins and Managers can insert workforce members"
    ON public.workforce_members FOR INSERT
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) 
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Admins and Managers can update workforce members" ON public.workforce_members;
CREATE POLICY "Admins and Managers can update workforce members"
    ON public.workforce_members FOR UPDATE
    USING (
        public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) 
        OR public.is_superadmin()
    );

-- ---------------------------------------------------------------------
-- 5. Audit Logs Policies (Append-only, strictly immutable)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Privileged members can view audit logs" ON public.audit_logs;
CREATE POLICY "Privileged members can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']) 
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "Authenticated users and services can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users and services can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (
        public.is_member_of(organization_id) OR public.is_superadmin()
    );
