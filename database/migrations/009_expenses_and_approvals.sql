-- OpsPilot PostgreSQL Schema Migration: 009_expenses_and_approvals.sql
-- Description: Field Expenses, Reimbursements & Multi-Stage Expense Approvals

-- 1. Expenses (Field Claims, Fuel, Tooling, Per-Diem)
CREATE TABLE IF NOT EXISTS public.expenses (
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
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_expenses_org_code UNIQUE (organization_id, claim_code)
);

CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_member ON public.expenses(workforce_member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_wo ON public.expenses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON public.expenses(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Backward Compatibility View: expense_claims
CREATE OR REPLACE VIEW public.expense_claims WITH (security_invoker = true) AS
SELECT * FROM public.expenses;

-- 2. Expense Approvals (Audit Trail of Manager Reviews)
CREATE TABLE IF NOT EXISTS public.expense_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('approved', 'rejected', 'requested_changes')),
    notes TEXT,
    decided_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_approvals_org ON public.expense_approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_exp ON public.expense_approvals(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver ON public.expense_approvals(approver_id);
