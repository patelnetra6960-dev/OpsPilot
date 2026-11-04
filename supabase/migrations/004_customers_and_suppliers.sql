-- OpsPilot PostgreSQL Schema Migration: 004_customers_and_suppliers.sql
-- Description: Customers (Client Accounts) & External Material/Equipment Suppliers

-- 1. Customers (Client Organizations & Accounts)
CREATE TABLE IF NOT EXISTS public.customers (
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

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_sla ON public.customers(organization_id, sla_tier);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Backward Compatibility View: clients
CREATE OR REPLACE VIEW public.clients WITH (security_invoker = true) AS
SELECT * FROM public.customers;

-- 2. Suppliers (Parts Vendors, Equipment Manufacturers, Service Contractors)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'preferred')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_suppliers_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
