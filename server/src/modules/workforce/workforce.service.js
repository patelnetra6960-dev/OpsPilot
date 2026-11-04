import { supabaseAdmin, mockDatabase } from '../../config/supabase.js';
import env from '../../config/env.js';

export const workforceService = {
  /**
   * Get all workforce members for a specific tenant
   * Guarantees tenant isolation: tenantId is enforced as the primary query filter
   */
  async getWorkforce(tenantId, { department, status, search } = {}) {
    if (env.isMockMode) {
      let members = mockDatabase.workforce.filter((w) => w.organization_id === tenantId);

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
      .eq('organization_id', tenantId);

    if (department) query = query.eq('department', department);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * Create a new workforce member strictly attached to tenantId
   */
  async createWorkforceMember(tenantId, memberData) {
    if (env.isMockMode) {
      const newMember = {
        id: `wm-${Date.now()}`,
        organization_id: tenantId,
        ...memberData,
        status: memberData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
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
   * Get operational statistics for the dashboard
   */
  async getWorkforceStats(tenantId) {
    if (env.isMockMode) {
      const members = mockDatabase.workforce.filter((w) => w.organization_id === tenantId);
      const activeCount = members.filter((m) => m.status === 'active').length;
      const onLeaveCount = members.filter((m) => m.status === 'on_leave').length;
      const departments = [...new Set(members.map((m) => m.department))];

      return {
        totalStaff: members.length,
        activeStaff: activeCount,
        onLeave: onLeaveCount,
        departmentsCount: departments.length,
        departments
      };
    }

    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .select('status, department')
      .eq('organization_id', tenantId);

    if (error) throw error;

    const totalStaff = data.length;
    const activeStaff = data.filter((m) => m.status === 'active').length;
    const onLeave = data.filter((m) => m.status === 'on_leave').length;
    const departments = [...new Set(data.map((m) => m.department).filter(Boolean))];

    return {
      totalStaff,
      activeStaff,
      onLeave,
      departmentsCount: departments.length,
      departments
    };
  }
};

export default workforceService;
