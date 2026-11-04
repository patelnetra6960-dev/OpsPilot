-- OpsPilot PostgreSQL Schema Migration: 001_core_extensions_and_tenants.sql
-- Description: Core Database Extensions, Universal Updated_At Trigger, Organizations & User Memberships

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Universal Trigger Function for Automatic updated_at Timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Users Profiles (Extends Supabase auth.users or acts as profile entity)
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id UUID PRIMARY KEY, -- Matches auth.users(id) in Supabase
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    is_superadmin BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_profiles_email ON public.users_profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_profiles_superadmin ON public.users_profiles(is_superadmin) WHERE is_superadmin = true;

DROP TRIGGER IF EXISTS trg_users_profiles_updated_at ON public.users_profiles;
CREATE TRIGGER trg_users_profiles_updated_at
    BEFORE UPDATE ON public.users_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. Organization Memberships (Tenant Mapping & RBAC)
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

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON public.organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_lookup ON public.organization_members(organization_id, user_id, status);

DROP TRIGGER IF EXISTS trg_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
