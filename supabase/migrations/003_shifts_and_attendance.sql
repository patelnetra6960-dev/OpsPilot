-- OpsPilot PostgreSQL Schema Migration: 003_shifts_and_attendance.sql
-- Description: Shift Scheduling, Roster Management, and Geofenced Clock-In/Out Attendance Records

-- 1. Shift Schedules
CREATE TABLE IF NOT EXISTS public.shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workforce_member_id UUID NOT NULL REFERENCES public.workforce_members(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    department VARCHAR(100),
    location_name VARCHAR(255),
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_shift_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_shift_schedules_org ON public.shift_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_member ON public.shift_schedules(workforce_member_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_times ON public.shift_schedules(organization_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_status ON public.shift_schedules(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_active ON public.shift_schedules(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_shift_schedules_updated_at ON public.shift_schedules;
CREATE TRIGGER trg_shift_schedules_updated_at
    BEFORE UPDATE ON public.shift_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Attendance Records (Live Telemetry & Hours)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workforce_member_id UUID NOT NULL REFERENCES public.workforce_members(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shift_schedules(id) ON DELETE SET NULL,
    clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_in_lat NUMERIC(10, 7),
    clock_in_lng NUMERIC(10, 7),
    clock_in_geofence_verified BOOLEAN DEFAULT false,
    clock_out_time TIMESTAMPTZ,
    clock_out_lat NUMERIC(10, 7),
    clock_out_lng NUMERIC(10, 7),
    total_hours NUMERIC(6, 2) DEFAULT 0.00,
    break_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'disputed', 'rejected')),
    approved_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_org ON public.attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance_records(workforce_member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON public.attendance_records(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(organization_id, clock_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_active ON public.attendance_records(organization_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
