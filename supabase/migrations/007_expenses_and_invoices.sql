-- OpsPilot PostgreSQL Schema Migration: 007_expenses_and_invoices.sql
-- Description: Field Expense Claims, Reimbursement Workflow, Invoices & Line Items

-- 1. Expense Claims (Receipts & Field Reimbursable Costs)
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

CREATE INDEX IF NOT EXISTS idx_expense_claims_org ON public.expense_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_member ON public.expense_claims(workforce_member_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_wo ON public.expense_claims(work_order_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON public.expense_claims(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_active ON public.expense_claims(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_expense_claims_updated_at ON public.expense_claims;
CREATE TRIGGER trg_expense_claims_updated_at
    BEFORE UPDATE ON public.expense_claims
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Invoices (Billing & Accounts Receivable)
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

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_active ON public.invoices(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Invoice Line Items
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

CREATE INDEX IF NOT EXISTS idx_invoice_items_org ON public.invoice_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
