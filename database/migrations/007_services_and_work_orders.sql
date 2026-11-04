-- OpsPilot PostgreSQL Schema Migration: 007_services_and_work_orders.sql
-- Description: Customer Service Requests, Dispatched Work Orders & Compliance Checklists

-- 1. Service Requests (Customer Portal Intake & Triage)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_service_requests_org ON public.service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_urgency ON public.service_requests(organization_id, urgency);
CREATE INDEX IF NOT EXISTS idx_service_requests_active ON public.service_requests(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated_at
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Work Orders (Dispatched Field Jobs)
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_work_orders_org ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_tech ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_active ON public.work_orders(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON public.work_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Link service_requests.converted_work_order_id to work_orders
ALTER TABLE public.service_requests
    DROP CONSTRAINT IF EXISTS fk_service_requests_work_order,
    ADD CONSTRAINT fk_service_requests_work_order
    FOREIGN KEY (converted_work_order_id)
    REFERENCES public.work_orders(id)
    ON DELETE SET NULL;

-- Link stock_transactions.work_order_id to work_orders
ALTER TABLE public.stock_transactions
    DROP CONSTRAINT IF EXISTS fk_stock_transactions_work_order,
    ADD CONSTRAINT fk_stock_transactions_work_order
    FOREIGN KEY (work_order_id)
    REFERENCES public.work_orders(id)
    ON DELETE SET NULL;

-- 3. Work Order Checklists
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

CREATE INDEX IF NOT EXISTS idx_wo_checklists_org ON public.work_order_checklists(organization_id);
CREATE INDEX IF NOT EXISTS idx_wo_checklists_wo ON public.work_order_checklists(work_order_id);

DROP TRIGGER IF EXISTS trg_work_order_checklists_updated_at ON public.work_order_checklists;
CREATE TRIGGER trg_work_order_checklists_updated_at
    BEFORE UPDATE ON public.work_order_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
