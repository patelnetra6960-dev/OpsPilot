import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Calculates Great Circle distance between two points in meters using Haversine formula
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

class AttendanceService {
  /**
   * Helper: Resolve workforce member ID for current user or tenant
   */
  async resolveWorkforceMemberId(tenantId, userId, requestedMemberId = null) {
    if (requestedMemberId) return requestedMemberId;

    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.organization_id === tenantId && w.user_id === userId && !w.deleted_at
      );
      if (member) return member.id;

      // Fallback: search by email
      const user = (mockDatabase.users || []).find((u) => u.id === userId);
      if (user) {
        const byEmail = (mockDatabase.workforce || []).find(
          (w) => w.organization_id === tenantId && w.email === user.email && !w.deleted_at
        );
        if (byEmail) return byEmail.id;
      }
      return 'w3'; // Default to Liam Patel mock worker
    }

    const { data } = await supabaseAdmin
      .from('workforce_members')
      .select('id')
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (data?.id) return data.id;

    // Fallback: search by user email
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (userProfile?.email) {
      const { data: byEmail } = await supabaseAdmin
        .from('workforce_members')
        .select('id')
        .eq('organization_id', tenantId)
        .eq('email', userProfile.email)
        .is('deleted_at', null)
        .maybeSingle();

      if (byEmail?.id) return byEmail.id;
    }

    const err = new Error('No workforce member record associated with this user');
    err.status = 404;
    err.code = 'WORKFORCE_MEMBER_NOT_FOUND';
    throw err;
  }

  /**
   * Clock In
   */
  async clockIn(tenantId, userId, data) {
    const memberId = await this.resolveWorkforceMemberId(tenantId, userId, data.workforce_member_id);

    // 1. Check if user already has an active unclosed attendance record
    if (env.isMockMode || !supabaseAdmin) {
      const active = (mockDatabase.attendance || []).find(
        (a) =>
          a.organization_id === tenantId &&
          a.workforce_member_id === memberId &&
          !a.clock_out_time &&
          !a.deleted_at
      );

      if (active) {
        const err = new Error('Worker already has an active clock-in session');
        err.status = 400;
        err.code = 'ALREADY_CLOCKED_IN';
        throw err;
      }

      // Check geofence if shift coordinates exist
      let geofenceVerified = false;
      if (data.shift_id) {
        const shift = (mockDatabase.shifts || []).find((s) => s.id === data.shift_id);
        if (shift?.location_lat && shift?.location_lng && data.latitude && data.longitude) {
          const dist = calculateDistanceMeters(
            shift.location_lat,
            shift.location_lng,
            data.latitude,
            data.longitude
          );
          geofenceVerified = dist !== null && dist <= 150; // 150m radius
        } else {
          geofenceVerified = true;
        }
      } else {
        geofenceVerified = true;
      }

      const newRecord = {
        id: crypto.randomUUID(),
        organization_id: tenantId,
        workforce_member_id: memberId,
        shift_id: data.shift_id || null,
        clock_in_time: new Date().toISOString(),
        clock_in_lat: data.latitude || null,
        clock_in_lng: data.longitude || null,
        clock_in_geofence_verified: geofenceVerified,
        clock_out_time: null,
        clock_out_lat: null,
        clock_out_lng: null,
        total_hours: 0,
        break_minutes: 0,
        status: 'pending_approval',
        approved_by: null,
        approved_at: null,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };

      if (!mockDatabase.attendance) mockDatabase.attendance = [];
      mockDatabase.attendance.push(newRecord);

      if (mockDatabase.auditLogs) {
        mockDatabase.auditLogs.unshift({
          id: crypto.randomUUID(),
          organization_id: tenantId,
          user_id: userId,
          action: 'ATTENDANCE_CLOCK_IN',
          entity_type: 'attendance_records',
          entity_id: newRecord.id,
          created_at: new Date().toISOString()
        });
      }

      return newRecord;
    }

    // Live Supabase
    const { data: existingActive } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('organization_id', tenantId)
      .eq('workforce_member_id', memberId)
      .is('clock_out_time', null)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingActive) {
      const err = new Error('Worker already has an active clock-in session');
      err.status = 400;
      err.code = 'ALREADY_CLOCKED_IN';
      throw err;
    }

    let geofenceVerified = true;
    if (data.shift_id) {
      const { data: shift } = await supabaseAdmin
        .from('shift_schedules')
        .select('location_lat, location_lng')
        .eq('id', data.shift_id)
        .maybeSingle();

      if (shift?.location_lat && shift?.location_lng && data.latitude && data.longitude) {
        const dist = calculateDistanceMeters(
          shift.location_lat,
          shift.location_lng,
          data.latitude,
          data.longitude
        );
        geofenceVerified = dist !== null && dist <= 150;
      }
    }

    const { data: created, error } = await supabaseAdmin
      .from('attendance_records')
      .insert({
        organization_id: tenantId,
        workforce_member_id: memberId,
        shift_id: data.shift_id || null,
        clock_in_time: new Date().toISOString(),
        clock_in_lat: data.latitude || null,
        clock_in_lng: data.longitude || null,
        clock_in_geofence_verified: geofenceVerified,
        notes: data.notes || null
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to clock in', error);
      throw error;
    }

    return created;
  }

  /**
   * Clock Out
   */
  async clockOut(tenantId, userId, data) {
    const memberId = await this.resolveWorkforceMemberId(tenantId, userId, data.workforce_member_id);

    if (env.isMockMode || !supabaseAdmin) {
      const active = (mockDatabase.attendance || []).find(
        (a) =>
          a.organization_id === tenantId &&
          a.workforce_member_id === memberId &&
          !a.clock_out_time &&
          !a.deleted_at
      );

      if (!active) {
        const err = new Error('No active clock-in session found to clock out');
        err.status = 400;
        err.code = 'NO_ACTIVE_CLOCK_IN';
        throw err;
      }

      const now = new Date();
      const inTime = new Date(active.clock_in_time);
      const diffMs = now.getTime() - inTime.getTime();
      const breakMins = data.break_minutes || 0;
      const netMinutes = Math.max(0, Math.round(diffMs / 60000) - breakMins);
      const totalHours = parseFloat((netMinutes / 60).toFixed(2));

      active.clock_out_time = now.toISOString();
      active.clock_out_lat = data.latitude || null;
      active.clock_out_lng = data.longitude || null;
      active.break_minutes = breakMins;
      active.total_hours = totalHours;
      active.updated_at = now.toISOString();
      if (data.notes) {
        active.notes = active.notes ? `${active.notes} | Clock-out: ${data.notes}` : data.notes;
      }

      if (mockDatabase.auditLogs) {
        mockDatabase.auditLogs.unshift({
          id: crypto.randomUUID(),
          organization_id: tenantId,
          user_id: userId,
          action: 'ATTENDANCE_CLOCK_OUT',
          entity_type: 'attendance_records',
          entity_id: active.id,
          total_hours: totalHours,
          created_at: now.toISOString()
        });
      }

      return active;
    }

    const { data: active, error: fetchErr } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('organization_id', tenantId)
      .eq('workforce_member_id', memberId)
      .is('clock_out_time', null)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchErr || !active) {
      const err = new Error('No active clock-in session found to clock out');
      err.status = 400;
      err.code = 'NO_ACTIVE_CLOCK_IN';
      throw err;
    }

    const now = new Date();
    const inTime = new Date(active.clock_in_time);
    const diffMs = now.getTime() - inTime.getTime();
    const breakMins = data.break_minutes || 0;
    const netMinutes = Math.max(0, Math.round(diffMs / 60000) - breakMins);
    const totalHours = parseFloat((netMinutes / 60).toFixed(2));

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('attendance_records')
      .update({
        clock_out_time: now.toISOString(),
        clock_out_lat: data.latitude || null,
        clock_out_lng: data.longitude || null,
        break_minutes: breakMins,
        total_hours: totalHours,
        notes: data.notes
          ? active.notes
            ? `${active.notes} | Clock-out: ${data.notes}`
            : data.notes
          : active.notes,
        updated_at: now.toISOString()
      })
      .eq('id', active.id)
      .select()
      .single();

    if (updateErr) {
      logger.error('Failed to clock out', updateErr);
      throw updateErr;
    }

    return updated;
  }

  /**
   * Get Timesheets / Attendance Records with filtering & pagination
   */
  async getTimesheets(tenantId, options = {}) {
    const {
      page = 1,
      limit = 50,
      workforce_member_id,
      shift_id,
      status,
      start_date,
      end_date
    } = options;

    if (env.isMockMode || !supabaseAdmin) {
      let items = (mockDatabase.attendance || []).filter(
        (a) => a.organization_id === tenantId && !a.deleted_at
      );

      if (workforce_member_id) {
        items = items.filter((a) => a.workforce_member_id === workforce_member_id);
      }
      if (shift_id) {
        items = items.filter((a) => a.shift_id === shift_id);
      }
      if (status && status !== 'all') {
        items = items.filter((a) => a.status === status);
      }
      if (start_date) {
        const start = new Date(start_date).getTime();
        items = items.filter((a) => new Date(a.clock_in_time).getTime() >= start);
      }
      if (end_date) {
        const end = new Date(end_date).getTime();
        items = items.filter((a) => new Date(a.clock_in_time).getTime() <= end);
      }

      items.sort((a, b) => new Date(b.clock_in_time) - new Date(a.clock_in_time));

      const enriched = items.map((att) => {
        const worker = (mockDatabase.workforce || []).find((w) => w.id === att.workforce_member_id);
        const shift = att.shift_id
          ? (mockDatabase.shifts || []).find((s) => s.id === att.shift_id)
          : null;
        return {
          ...att,
          worker: worker
            ? {
                id: worker.id,
                full_name: `${worker.first_name || ''} ${worker.last_name || ''}`.trim(),
                employee_code: worker.employee_code,
                department: worker.department
              }
            : null,
          shift: shift
            ? {
                id: shift.id,
                department: shift.department,
                location_name: shift.location_name
              }
            : null
        };
      });

      const total = enriched.length;
      const offset = (page - 1) * limit;

      return {
        timesheets: enriched.slice(offset, offset + limit),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }

    let query = supabaseAdmin
      .from('attendance_records')
      .select('*, workforce_members(id, first_name, last_name, employee_code, department)', {
        count: 'exact'
      })
      .eq('organization_id', tenantId)
      .is('deleted_at', null);

    if (workforce_member_id) query = query.eq('workforce_member_id', workforce_member_id);
    if (shift_id) query = query.eq('shift_id', shift_id);
    if (status && status !== 'all') query = query.eq('status', status);
    if (start_date) query = query.gte('clock_in_time', start_date);
    if (end_date) query = query.lte('clock_in_time', end_date);

    const offset = (page - 1) * limit;
    query = query.order('clock_in_time', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      logger.error('Failed to query attendance timesheets', error);
      throw error;
    }

    return {
      timesheets: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit) || 1
      }
    };
  }

  /**
   * Approve or Reject a Timesheet
   */
  async approveTimesheet(tenantId, approverUserId, attendanceId, data) {
    const { status, notes } = data;

    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.attendance || []).findIndex(
        (a) => a.id === attendanceId && a.organization_id === tenantId
      );

      if (idx === -1) {
        const err = new Error('Attendance timesheet not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      mockDatabase.attendance[idx].status = status;
      mockDatabase.attendance[idx].approved_by = approverUserId;
      mockDatabase.attendance[idx].approved_at = new Date().toISOString();
      if (notes) {
        mockDatabase.attendance[idx].notes = mockDatabase.attendance[idx].notes
          ? `${mockDatabase.attendance[idx].notes} | Review: ${notes}`
          : notes;
      }

      if (mockDatabase.auditLogs) {
        mockDatabase.auditLogs.unshift({
          id: crypto.randomUUID(),
          organization_id: tenantId,
          user_id: approverUserId,
          action: status === 'approved' ? 'TIMESHEET_APPROVED' : 'TIMESHEET_REJECTED',
          entity_type: 'attendance_records',
          entity_id: attendanceId,
          status,
          created_at: new Date().toISOString()
        });
      }

      return mockDatabase.attendance[idx];
    }

    const { data: updated, error } = await supabaseAdmin
      .from('attendance_records')
      .update({
        status,
        approved_by: approverUserId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', attendanceId)
      .eq('organization_id', tenantId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to approve timesheet', error);
      throw error;
    }

    return updated;
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
