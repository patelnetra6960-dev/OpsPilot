import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

class ShiftService {
  /**
   * Helper: Check if worker has an overlapping shift
   */
  async checkShiftConflict(tenantId, workforceMemberId, startTime, endTime, excludeShiftId = null) {
    const newStart = new Date(startTime).getTime();
    const newEnd = new Date(endTime).getTime();

    if (env.isMockMode || !supabaseAdmin) {
      const existing = (mockDatabase.shifts || []).filter((s) => {
        if (s.organization_id !== tenantId) return false;
        if (s.workforce_member_id !== workforceMemberId) return false;
        if (s.deleted_at) return false;
        if (s.status === 'cancelled') return false;
        if (excludeShiftId && s.id === excludeShiftId) return false;

        const sStart = new Date(s.start_time).getTime();
        const sEnd = new Date(s.end_time).getTime();
        // Overlap condition: start < newEnd && end > newStart
        return sStart < newEnd && sEnd > newStart;
      });

      return existing.length > 0 ? existing[0] : null;
    }

    let query = supabaseAdmin
      .from('shift_schedules')
      .select('id, workforce_member_id, start_time, end_time, status')
      .eq('organization_id', tenantId)
      .eq('workforce_member_id', workforceMemberId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (excludeShiftId) {
      query = query.neq('id', excludeShiftId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Error checking shift conflict', error);
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Get shifts with search, filtering, and pagination
   */
  async getShifts(tenantId, options = {}) {
    const {
      page = 1,
      limit = 50,
      workforce_member_id,
      start_date,
      end_date,
      status,
      department
    } = options;

    if (env.isMockMode || !supabaseAdmin) {
      let items = (mockDatabase.shifts || []).filter(
        (s) => s.organization_id === tenantId && !s.deleted_at
      );

      if (workforce_member_id) {
        items = items.filter((s) => s.workforce_member_id === workforce_member_id);
      }
      if (status && status !== 'all') {
        items = items.filter((s) => s.status === status);
      }
      if (department && department !== 'all') {
        items = items.filter(
          (s) => (s.department || '').toLowerCase() === department.toLowerCase()
        );
      }
      if (start_date) {
        const startFilter = new Date(start_date).getTime();
        items = items.filter((s) => new Date(s.start_time).getTime() >= startFilter);
      }
      if (end_date) {
        const endFilter = new Date(end_date).getTime();
        items = items.filter((s) => new Date(s.end_time).getTime() <= endFilter);
      }

      // Sort by start_time ascending
      items.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      // Attach workforce member details
      const enriched = items.map((shift) => {
        const worker = (mockDatabase.workforce || []).find((w) => w.id === shift.workforce_member_id);
        return {
          ...shift,
          worker: worker
            ? {
                id: worker.id,
                full_name: `${worker.first_name || ''} ${worker.last_name || ''}`.trim(),
                employee_code: worker.employee_code,
                department: worker.department
              }
            : null
        };
      });

      const total = enriched.length;
      const offset = (page - 1) * limit;
      const paginated = enriched.slice(offset, offset + limit);

      return {
        shifts: paginated,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }

    let query = supabaseAdmin
      .from('shift_schedules')
      .select('*, workforce_members(id, first_name, last_name, employee_code, department)', {
        count: 'exact'
      })
      .eq('organization_id', tenantId)
      .is('deleted_at', null);

    if (workforce_member_id) {
      query = query.eq('workforce_member_id', workforce_member_id);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (department && department !== 'all') {
      query = query.ilike('department', department);
    }
    if (start_date) {
      query = query.gte('start_time', start_date);
    }
    if (end_date) {
      query = query.lte('end_time', end_date);
    }

    const offset = (page - 1) * limit;
    query = query.order('start_time', { ascending: true }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      logger.error('Failed to query shift schedules', error);
      throw error;
    }

    return {
      shifts: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit) || 1
      }
    };
  }

  /**
   * Get single shift by ID
   */
  async getShiftById(tenantId, shiftId) {
    if (env.isMockMode || !supabaseAdmin) {
      const shift = (mockDatabase.shifts || []).find(
        (s) => s.id === shiftId && s.organization_id === tenantId && !s.deleted_at
      );
      if (!shift) {
        const err = new Error('Shift schedule not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
      const worker = (mockDatabase.workforce || []).find((w) => w.id === shift.workforce_member_id);
      return {
        ...shift,
        worker: worker
          ? {
              id: worker.id,
              full_name: `${worker.first_name || ''} ${worker.last_name || ''}`.trim(),
              employee_code: worker.employee_code,
              department: worker.department
            }
          : null
      };
    }

    const { data, error } = await supabaseAdmin
      .from('shift_schedules')
      .select('*, workforce_members(id, first_name, last_name, employee_code, department)')
      .eq('id', shiftId)
      .eq('organization_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      const err = new Error('Shift schedule not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return data;
  }

  /**
   * Create a new shift schedule with overlap detection
   */
  async createShift(tenantId, userId, data) {
    const { workforce_member_id, start_time, end_time } = data;

    // 1. Verify conflict / overlap
    const conflict = await this.checkShiftConflict(tenantId, workforce_member_id, start_time, end_time);
    if (conflict) {
      const err = new Error('Schedule conflict: Worker already has an overlapping shift in this time window');
      err.status = 400;
      err.code = 'SHIFT_SCHEDULE_CONFLICT';
      err.details = { conflictShiftId: conflict.id, start: conflict.start_time, end: conflict.end_time };
      throw err;
    }

    const newShift = {
      id: crypto.randomUUID(),
      organization_id: tenantId,
      workforce_member_id,
      start_time,
      end_time,
      department: data.department || null,
      location_name: data.location_name || null,
      location_lat: data.location_lat || null,
      location_lng: data.location_lng || null,
      status: 'scheduled',
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.shifts) mockDatabase.shifts = [];
      mockDatabase.shifts.push(newShift);

      // Audit log
      if (mockDatabase.auditLogs) {
        mockDatabase.auditLogs.unshift({
          id: crypto.randomUUID(),
          organization_id: tenantId,
          user_id: userId,
          action: 'SHIFT_CREATED',
          entity_type: 'shift_schedules',
          entity_id: newShift.id,
          new_values: newShift,
          created_at: new Date().toISOString()
        });
      }

      return newShift;
    }

    const { data: created, error } = await supabaseAdmin
      .from('shift_schedules')
      .insert(newShift)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create shift schedule', error);
      throw error;
    }

    return created;
  }

  /**
   * Update an existing shift schedule
   */
  async updateShift(tenantId, userId, shiftId, data) {
    const current = await this.getShiftById(tenantId, shiftId);

    const targetWorkerId = data.workforce_member_id || current.workforce_member_id;
    const targetStart = data.start_time || current.start_time;
    const targetEnd = data.end_time || current.end_time;

    // Check overlap if timing or worker changed
    if (data.start_time || data.end_time || data.workforce_member_id) {
      const conflict = await this.checkShiftConflict(
        tenantId,
        targetWorkerId,
        targetStart,
        targetEnd,
        shiftId
      );
      if (conflict) {
        const err = new Error('Schedule conflict: Worker already has an overlapping shift in this time window');
        err.status = 400;
        err.code = 'SHIFT_SCHEDULE_CONFLICT';
        err.details = { conflictShiftId: conflict.id };
        throw err;
      }
    }

    const updates = {
      ...data,
      updated_at: new Date().toISOString()
    };

    if (env.isMockMode || !supabaseAdmin) {
      const idx = mockDatabase.shifts.findIndex((s) => s.id === shiftId && s.organization_id === tenantId);
      if (idx === -1) {
        const err = new Error('Shift schedule not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
      mockDatabase.shifts[idx] = { ...mockDatabase.shifts[idx], ...updates };

      if (mockDatabase.auditLogs) {
        mockDatabase.auditLogs.unshift({
          id: crypto.randomUUID(),
          organization_id: tenantId,
          user_id: userId,
          action: 'SHIFT_UPDATED',
          entity_type: 'shift_schedules',
          entity_id: shiftId,
          old_values: current,
          new_values: mockDatabase.shifts[idx],
          created_at: new Date().toISOString()
        });
      }

      return mockDatabase.shifts[idx];
    }

    const { data: updated, error } = await supabaseAdmin
      .from('shift_schedules')
      .update(updates)
      .eq('id', shiftId)
      .eq('organization_id', tenantId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update shift schedule', error);
      throw error;
    }

    return updated;
  }

  /**
   * Soft-delete a shift schedule
   */
  async deleteShift(tenantId, userId, shiftId) {
    const current = await this.getShiftById(tenantId, shiftId);

    if (env.isMockMode || !supabaseAdmin) {
      const idx = mockDatabase.shifts.findIndex((s) => s.id === shiftId && s.organization_id === tenantId);
      if (idx !== -1) {
        mockDatabase.shifts[idx].deleted_at = new Date().toISOString();
        mockDatabase.shifts[idx].status = 'cancelled';
      }

      if (mockDatabase.auditLogs) {
        mockDatabase.auditLogs.unshift({
          id: crypto.randomUUID(),
          organization_id: tenantId,
          user_id: userId,
          action: 'SHIFT_CANCELLED',
          entity_type: 'shift_schedules',
          entity_id: shiftId,
          created_at: new Date().toISOString()
        });
      }

      return { success: true, message: 'Shift schedule cancelled' };
    }

    const { error } = await supabaseAdmin
      .from('shift_schedules')
      .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
      .eq('id', shiftId)
      .eq('organization_id', tenantId);

    if (error) {
      logger.error('Failed to cancel shift schedule', error);
      throw error;
    }

    return { success: true, message: 'Shift schedule cancelled' };
  }
}

export const shiftService = new ShiftService();
export default shiftService;
