-- OpsPilot PostgreSQL Schema Migration: 014_performance_indexes_and_optimizations.sql
-- Description: Targeted Composite Indexes, Partial Indexes, and Query Plan Optimizations

-- 1. Tasks: Deadline Monitoring, Kanban Queries & Sorting
CREATE INDEX IF NOT EXISTS idx_tasks_perf_org_due 
    ON public.tasks(organization_id, due_date) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_perf_org_col_due 
    ON public.tasks(organization_id, column_name, due_date) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_perf_org_updated 
    ON public.tasks(organization_id, updated_at DESC);

-- 2. Projects: Target Dates & Health Filtering
CREATE INDEX IF NOT EXISTS idx_projects_perf_org_target 
    ON public.projects(organization_id, target_date) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_perf_org_health 
    ON public.projects(organization_id, health) 
    WHERE deleted_at IS NULL;

-- 3. Inventory: Low-Stock Automated Detection & Reorder Thresholds
CREATE INDEX IF NOT EXISTS idx_inventory_perf_stock_reorder 
    ON public.inventory_items(organization_id, in_stock, reorder_level) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_perf_status 
    ON public.inventory_items(organization_id, status) 
    WHERE deleted_at IS NULL;

-- 4. Work Orders: Dispatch Scheduling & Field Technician Workload
CREATE INDEX IF NOT EXISTS idx_work_orders_perf_org_sched 
    ON public.work_orders(organization_id, scheduled_start) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_perf_org_assign_status 
    ON public.work_orders(organization_id, assigned_to, status) 
    WHERE deleted_at IS NULL;

-- 5. Service Requests: SLA Escalations & Triage
CREATE INDEX IF NOT EXISTS idx_service_requests_perf_urgency_status 
    ON public.service_requests(organization_id, urgency, status) 
    WHERE deleted_at IS NULL;

-- 6. Invoices: Accounts Receivable & Overdue Payment Notifications
CREATE INDEX IF NOT EXISTS idx_invoices_perf_org_status_due 
    ON public.invoices(organization_id, status, due_date) 
    WHERE deleted_at IS NULL;

-- 7. Expenses: Approval Workflow & Expense Ledger
CREATE INDEX IF NOT EXISTS idx_expenses_perf_org_status_claim 
    ON public.expenses(organization_id, status, claim_date) 
    WHERE deleted_at IS NULL;

-- 8. Audit Trail: Entity-Level Chronological Filter
CREATE INDEX IF NOT EXISTS idx_audit_logs_perf_org_entity_time 
    ON public.audit_logs(organization_id, entity_type, created_at DESC);

-- 9. Notifications: Unread User Feed & Badge Counts
CREATE INDEX IF NOT EXISTS idx_notifications_perf_user_org_read 
    ON public.notifications(user_id, organization_id, is_read, created_at DESC);
