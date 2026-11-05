import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class ProjectRepository extends BaseRepository {
  constructor() {
    super('projects', {
      mockKey: 'projects',
      searchFields: ['name', 'project_code', 'description', 'client'],
      allowedFilterFields: ['status', 'health', 'customer_id', 'lead_id'],
      allowedSortFields: [
        'created_at',
        'updated_at',
        'name',
        'status',
        'health',
        'progress',
        'budget',
        'start_date',
        'target_date'
      ]
    });
  }

  /**
   * Find all members assigned to a project
   */
  async findMembers(projectId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const allMembers = mockDatabase.project_members || [];
      const projectMembers = allMembers.filter(
        (m) => m.project_id === projectId && m.organization_id === organizationId
      );

      // Hydrate with workforce info
      return projectMembers.map((pm) => {
        const wf = (mockDatabase.workforce || []).find((w) => w.id === pm.workforce_member_id);
        return {
          ...pm,
          workforce: wf || null
        };
      });
    }

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .select('*, workforce:workforce_members(*)')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Add a workforce member to a project
   */
  async addMember(projectId, organizationId, { workforce_member_id, project_role = 'Technician' }) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.project_members) mockDatabase.project_members = [];

      const existing = mockDatabase.project_members.find(
        (m) =>
          m.project_id === projectId &&
          m.workforce_member_id === workforce_member_id &&
          m.organization_id === organizationId
      );

      if (existing) {
        existing.project_role = project_role;
        return existing;
      }

      const newMember = {
        id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: organizationId,
        project_id: projectId,
        workforce_member_id,
        project_role,
        assigned_at: new Date().toISOString()
      };

      mockDatabase.project_members.push(newMember);
      return newMember;
    }

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        workforce_member_id,
        project_role
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Remove a member from a project
   */
  async removeMember(projectId, memberId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.project_members || []).findIndex(
        (m) =>
          (m.id === memberId || m.workforce_member_id === memberId) &&
          m.project_id === projectId &&
          m.organization_id === organizationId
      );

      if (idx !== -1) {
        mockDatabase.project_members.splice(idx, 1);
        return true;
      }
      return false;
    }

    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .or(`id.eq.${memberId},workforce_member_id.eq.${memberId}`)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return true;
  }

  /**
   * Find milestones for a project
   */
  async findMilestones(projectId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const allMilestones = mockDatabase.project_milestones || [];
      return allMilestones.filter(
        (m) => m.project_id === projectId && m.organization_id === organizationId
      );
    }

    const { data, error } = await supabaseAdmin
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('target_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add milestone to a project
   */
  async addMilestone(projectId, organizationId, { title, target_date, status = 'pending' }) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.project_milestones) mockDatabase.project_milestones = [];

      const newMilestone = {
        id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: organizationId,
        project_id: projectId,
        title,
        target_date: target_date || null,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDatabase.project_milestones.push(newMilestone);
      return newMilestone;
    }

    const { data, error } = await supabaseAdmin
      .from('project_milestones')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        title,
        target_date,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update milestone status or details
   */
  async updateMilestone(milestoneId, organizationId, updates) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const ms = (mockDatabase.project_milestones || []).find(
        (m) => m.id === milestoneId && m.organization_id === organizationId
      );

      if (!ms) {
        const err = new Error('Project milestone not found');
        err.status = 404;
        throw err;
      }

      Object.assign(ms, updates);
      if (updates.status === 'completed' && !ms.completed_at) {
        ms.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== 'completed') {
        ms.completed_at = null;
      }
      ms.updated_at = new Date().toISOString();
      return ms;
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    if (updates.status === 'completed') {
      payload.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'completed') {
      payload.completed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('project_milestones')
      .update(payload)
      .eq('id', milestoneId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const projectRepository = new ProjectRepository();
export default projectRepository;
