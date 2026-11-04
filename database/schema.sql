-- =====================================================================
-- OpsPilot Consolidated PostgreSQL Schema
-- Architecture: Multi-Tenant Modular Monolith with Row-Level Security
-- Primary Engine: Supabase PostgreSQL 15+
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Helper Functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- 3. Organizations (Multi-Tenant Workspaces)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'growth', 'enterprise')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    settings JSONB DEFAULT '{"theme": "system", "timezone": "UTC", "currency": "USD"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 4. Users Profiles
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    is_superadmin BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 5. Organization Memberships
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'manager', 'employee', 'customer', 'member')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    invited_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

-- 6. Workforce Directory
CREATE TABLE IF NOT EXISTS public.workforce_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    employee_code VARCHAR(100) NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100) DEFAULT 'Operations',
    designation VARCHAR(100) DEFAULT 'Associate',
    employment_type VARCHAR(50) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00 CHECK (hourly_rate >= 0),
    skills TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_workforce_org_employee_code UNIQUE (organization_id, employee_code)
);

-- 7. Shifts & Attendance
CREATE TABLE IF NOT EXISTS public.shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workforce_member_id UUID NOT NULL REFERENCES public.workforce_members(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    department VARCHAR(100),
    location_name VARCHAR(255),
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_shift_time_order CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workforce_member_id UUID NOT NULL REFERENCES public.workforce_members(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shift_schedules(id) ON DELETE SET NULL,
    clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_in_lat NUMERIC(10, 7),
    clock_in_lng NUMERIC(10, 7),
    clock_in_geofence_verified BOOLEAN DEFAULT false,
    clock_out_time TIMESTAMPTZ,
    clock_out_lat NUMERIC(10, 7),
    clock_out_lng NUMERIC(10, 7),
    total_hours NUMERIC(6, 2) DEFAULT 0.00,
    break_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'disputed', 'rejected')),
    approved_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 8. Assets & Inventory
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    asset_tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'equipment' CHECK (category IN ('vehicle', 'heavy_machinery', 'diagnostic_tool', 'equipment', 'facility')),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    assigned_to UUID REFERENCES public.workforce_members(id) ON DELETE SET NULL,
    last_service_date DATE,
    next_service_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_assets_org_tag UNIQUE (organization_id, asset_tag)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    in_stock INTEGER DEFAULT 0 NOT NULL CHECK (in_stock >= 0),
    reorder_level INTEGER DEFAULT 5 NOT NULL CHECK (reorder_level >= 0),
    unit_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (unit_cost >= 0),
    status VARCHAR(50) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_inventory_org_sku UNIQUE (organization_id, sku)
);

-- 9. Clients & Projects
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    sla_tier VARCHAR(50) DEFAULT 'standard' CHECK (sla_tier IN ('standard', 'priority', 'critical', 'premium')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    project_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    health VARCHAR(50) DEFAULT 'on_track' CHECK (health IN ('on_track', 'at_risk', 'delayed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    budget NUMERIC(12, 2) DEFAULT 0.00 CHECK (budget >= 0),
    spent NUMERIC(12, 2) DEFAULT 0.00 CHECK (spent >= 0),
    start_date DATE,
    target_date DATE,
    lead_id UUID REFERENCES public.workforce_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_projects_org_code UNIQUE (organization_id, project_code)
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    target_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Service Requests, Work Orders & Tasks
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    request_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    urgency VARCHAR(50) DEFAULT 'normal' CHECK (urgency IN ('critical', 'urgent', 'high', 'normal', 'low')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_review', 'converted', 'closed')),
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00 CHECK (estimated_cost >= 0),
    converted_work_order_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_service_requests_org_code UNIQUE (organization_id, request_code)
);

CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.workforce_members(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    site VARCHAR(255),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'dispatched', 'in_progress', 'review', 'completed', 'invoiced')),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    cost_estimate NUMERIC(10, 2) DEFAULT 0.00 CHECK (cost_estimate >= 0),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    customer_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_work_orders_org_code UNIQUE (organization_id, work_order_code)
);

CREATE TABLE IF NOT EXISTS public.work_order_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    item_text VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    sort_order INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Maintenance',
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    column_name VARCHAR(50) DEFAULT 'todo' CHECK (column_name IN ('todo', 'in_progress', 'review', 'completed')),
    assigned_to UUID REFERENCES public.workforce_members(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    due_date DATE,
    checklist_total INTEGER DEFAULT 0 CHECK (checklist_total >= 0),
    checklist_completed INTEGER DEFAULT 0 CHECK (checklist_completed >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_tasks_org_code UNIQUE (organization_id, task_code)
);

-- 11. Expenses & Invoices
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    claim_code VARCHAR(100) NOT NULL,
    workforce_member_id UUID NOT NULL REFERENCES public.workforce_members(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    receipt_url TEXT,
    receipt_attached BOOLEAN DEFAULT false NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    reviewed_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_expense_claims_org_code UNIQUE (organization_id, claim_code)
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_invoices_org_number UNIQUE (organization_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
