-- =====================================================================
-- OpsPilot Consolidated PostgreSQL Schema
-- Architecture: Multi-Tenant Modular Monolith with Dual-Tier RLS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Tenants)
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

-- 2. Users Profiles
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

-- 3. Organization Memberships
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

-- 4. Workforce Directory
CREATE TABLE IF NOT EXISTS public.workforce_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    employee_code VARCHAR(100) NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100) DEFAULT 'Operations',
    designation VARCHAR(100) DEFAULT 'Associate',
    employment_type VARCHAR(50) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_org_employee_code UNIQUE (organization_id, employee_code)
);

-- 5. Audit Logs
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
