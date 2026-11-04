-- OpsPilot PostgreSQL Schema Migration: 008_tasks_and_collaboration.sql
-- Description: Operational Tasks, Normalized Task Assignments, Comments & Attachments

-- 1. Tasks (Kanban Board, Maintenance Checklists & Field Activities)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Maintenance',
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    column_name VARCHAR(50) DEFAULT 'todo' CHECK (column_name IN ('todo', 'in_progress', 'review', 'completed')),
    assigned_to UUID REFERENCES public.workforce_members(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    due_date DATE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    checklist_total INTEGER DEFAULT 0 CHECK (checklist_total >= 0),
    checklist_completed INTEGER DEFAULT 0 CHECK (checklist_completed >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_tasks_org_code UNIQUE (organization_id, task_code)
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_col ON public.tasks(organization_id, column_name);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wo ON public.tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON public.tasks(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Task Assignments (Normalized Multi-Assignee Junction)
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    workforce_member_id UUID NOT NULL REFERENCES public.workforce_members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_task_assignment UNIQUE (task_id, workforce_member_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assign_org ON public.task_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_assign_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assign_member ON public.task_assignments(workforce_member_id);

-- 3. Task Comments (Collaboration & Audit Notes)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_comments_org ON public.task_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);

DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER trg_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Task Attachments (Photos, Inspection PDFs, Safety Files)
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_org ON public.task_attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user ON public.task_attachments(uploaded_by);
