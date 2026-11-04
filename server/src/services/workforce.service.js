import workforceRepository from '../repositories/workforce.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';

export const workforceService = {
  /**
   * Get all workforce members for a specific tenant
   */
  async getWorkforce(tenantId, { department, status, search } = {}) {
    if (env.isMockMode || !supabaseAdmin) {
      let members = (mockDatabase.workforce || []).filter(
        (w) => w.organization_id === tenantId && !w.deleted_at
      );

      if (department) {
        members = members.filter((m) => m.department.toLowerCase() === department.toLowerCase());
      }
      if (status) {
        members = members.filter((m) => m.status.toLowerCase() === status.toLowerCase());
      }
      if (search) {
        const query = search.toLowerCase();
        members = members.filter(
          (m) =>
            m.first_name.toLowerCase().includes(query) ||
            m.last_name.toLowerCase().includes(query) ||
            m.email.toLowerCase().includes(query) ||
            m.employee_code.toLowerCase().includes(query)
        );
      }

      return members;
    }

    let query = supabaseAdmin
      .from('workforce_members')
      .select('*')
      .eq('organization_id', tenantId)
      .is('deleted_at', null);

    if (department) query = query.eq('department', department);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new workforce member
   */
  async createMember(tenantId, memberData) {
    if (env.isMockMode || !supabaseAdmin) {
      const newMember = {
        id: `wm-${Date.now()}`,
        organization_id: tenantId,
        ...memberData,
        status: memberData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!mockDatabase.workforce) mockDatabase.workforce = [];
      mockDatabase.workforce.push(newMember);
      return newMember;
    }

    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .insert({
        organization_id: tenantId,
        ...memberData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get operational statistics for workforce
   */
  async getOperationalStats(tenantId) {
    return workforceRepository.getOperationalStats(tenantId);
  }
};

export default workforceService;
