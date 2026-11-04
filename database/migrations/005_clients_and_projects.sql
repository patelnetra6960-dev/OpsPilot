-- OpsPilot PostgreSQL Schema Migration: 005_clients_and_projects.sql
-- Description: Client Accounts & Multi-Phase Projects with Milestone Burndown Tracking

-- 1. Clients (Accounts & SLA Tiers)
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

CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_sla ON public.clients(organization_id, sla_tier);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Projects (Multi-Phase Deployments)
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

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_lead ON public.projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Project Milestones
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

CREATE INDEX IF NOT EXISTS idx_milestones_org ON public.project_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.project_milestones(project_id, status);

DROP TRIGGER IF EXISTS trg_project_milestones_updated_at ON public.project_milestones;
CREATE TRIGGER trg_project_milestones_updated_at
    BEFORE UPDATE ON public.project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
