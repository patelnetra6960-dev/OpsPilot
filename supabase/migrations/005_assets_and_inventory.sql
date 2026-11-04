-- OpsPilot PostgreSQL Schema Migration: 005_assets_and_inventory.sql
-- Description: Physical Assets, Warehouse Inventory Items & Stock Transaction Ledger

-- 1. Assets (Vehicles, Heavy Machinery, Tooling)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    asset_tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'equipment' CHECK (category IN ('vehicle', 'heavy_machinery', 'diagnostic_tool', 'equipment', 'facility')),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    assigned_to UUID REFERENCES public.workforce_members(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_cost NUMERIC(12, 2) DEFAULT 0.00 CHECK (purchase_cost >= 0),
    last_service_date DATE,
    next_service_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_assets_org_tag UNIQUE (organization_id, asset_tag)
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON public.assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_assets_assigned ON public.assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_supplier ON public.assets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_assets_active ON public.assets(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Inventory Items (Spare Parts, Components & Materials)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_inventory_org ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON public.inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_items(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON public.inventory_items(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Stock Transactions (Append-Only Inventory Ledger)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'adjustment', 'scrap', 'transfer')),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) DEFAULT 0.00 CHECK (unit_price >= 0),
    reference_note TEXT,
    performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_org ON public.stock_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_item ON public.stock_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_type ON public.stock_transactions(organization_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON public.stock_transactions(organization_id, created_at DESC);
