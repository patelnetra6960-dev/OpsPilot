-- OpsPilot PostgreSQL Schema Migration: 008_audit_logs_and_triggers.sql
-- Description: Enterprise Multi-Tenant Audit Trail & Tamper-Proof Immutability Rules

-- 1. Audit Logs (Tenant-Isolated, Append-Only)
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(organization_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(organization_id, created_at DESC);

-- 2. Immutability Protection: Disallow UPDATE and DELETE on audit logs
CREATE OR REPLACE RULE no_update_audit_logs AS
    ON UPDATE TO public.audit_logs
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_audit_logs AS
    ON DELETE TO public.audit_logs
    DO INSTEAD NOTHING;
