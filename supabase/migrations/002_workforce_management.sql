-- OpsPilot PostgreSQL Schema Migration: 002_workforce_management.sql
-- Description: Tenant-Isolated Workforce Directory, Skills, and Employee Lifecycle

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

CREATE INDEX IF NOT EXISTS idx_workforce_org ON public.workforce_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_workforce_user ON public.workforce_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workforce_email ON public.workforce_members(email);
CREATE INDEX IF NOT EXISTS idx_workforce_department ON public.workforce_members(organization_id, department);
CREATE INDEX IF NOT EXISTS idx_workforce_status ON public.workforce_members(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_workforce_active ON public.workforce_members(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_workforce_members_updated_at ON public.workforce_members;
CREATE TRIGGER trg_workforce_members_updated_at
    BEFORE UPDATE ON public.workforce_members
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
