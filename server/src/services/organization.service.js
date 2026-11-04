import organizationRepository from '../repositories/organization.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';

export const organizationService = {
  /**
   * List all organizations where user is an active member
   */
  async getUserOrganizations(userId) {
    return organizationRepository.findByUserId(userId);
  },

  /**
   * Get organization details by ID
   */
  async getById(orgId) {
    if (env.isMockMode) {
      const org = (mockDatabase.organizations || []).find(
        (o) => o.id === orgId || o.slug === orgId
      );
      return org || null;
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new Organization (Tenant) and assign creator as Owner
   */
  async createOrganization({ name, slug, subscription_tier = 'starter', settings = {} }, userId) {
    const formattedSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');

    if (env.isMockMode || !supabaseAdmin) {
      const newOrg = {
        id: `org-${Date.now()}`,
        name,
        slug: formattedSlug,
        subscription_tier,
        is_active: true,
        settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'owner'
      };

      const newMembership = {
        id: `mem-${Date.now()}`,
        organization_id: newOrg.id,
        user_id: userId,
        role: 'owner',
        status: 'active'
      };

      if (!mockDatabase.organizations) mockDatabase.organizations = [];
      if (!mockDatabase.memberships) mockDatabase.memberships = [];

      mockDatabase.organizations.push(newOrg);
      mockDatabase.memberships.push(newMembership);

      return newOrg;
    }

    // Production: Supabase Insert
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        slug: formattedSlug,
        subscription_tier,
        settings
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add creator as organization owner
    const { error: memError } = await supabaseAdmin.from('organization_members').insert({
      organization_id: newOrg.id,
      user_id: userId,
      role: 'owner',
      status: 'active'
    });

    if (memError) throw memError;

    return {
      ...newOrg,
      role: 'owner'
    };
  },

  /**
   * List members of an organization
   */
  async getOrganizationMembers(orgId) {
    return organizationRepository.findMembers(orgId);
  },

  /**
   * Add / Invite Member to Organization
   */
  async addMember({ organizationId, userId, role = 'employee', requesterRole }) {
    if (!['owner', 'admin'].includes(requesterRole)) {
      const err = new Error('Forbidden: Only organization owners and admins can invite members');
      err.status = 403;
      err.code = 'INSUFFICIENT_ROLE_PERMISSIONS';
      throw err;
    }

    if (role === 'owner' && requesterRole !== 'owner') {
      const err = new Error('Forbidden: Only organization owner can assign owner role');
      err.status = 403;
      err.code = 'FORBIDDEN_CANNOT_ASSIGN_OWNER';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      const existing = (mockDatabase.memberships || []).find(
        (m) => m.organization_id === organizationId && m.user_id === userId
      );
      if (existing) {
        const err = new Error('User is already a member of this organization');
        err.status = 409;
        err.code = 'CONFLICT_MEMBER_EXISTS';
        throw err;
      }

      const newMembership = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organization_id: organizationId,
        user_id: userId,
        role,
        status: 'active',
        created_at: new Date().toISOString()
      };

      if (!mockDatabase.memberships) mockDatabase.memberships = [];
      mockDatabase.memberships.push(newMembership);
      return newMembership;
    }

    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update Member Role with Anti-Privilege Escalation and Ownership Protection
   */
  async updateMemberRole({ organizationId, memberId, newRole, requesterRole, requesterUserId }) {
    if (!['owner', 'admin'].includes(requesterRole)) {
      const err = new Error('Forbidden: Only organization owners and admins can update roles');
      err.status = 403;
      err.code = 'INSUFFICIENT_ROLE_PERMISSIONS';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      const membership = (mockDatabase.memberships || []).find(
        (m) => (m.id === memberId || m.user_id === memberId) && m.organization_id === organizationId
      );

      if (!membership) {
        const err = new Error('Organization membership record not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // Prevent changing own role (Anti-Privilege Escalation)
      if (membership.user_id === requesterUserId) {
        const err = new Error(
          'Privilege Escalation Blocked: You cannot modify your own organization role'
        );
        err.status = 403;
        err.code = 'FORBIDDEN_SELF_ROLE_ELEVATION';
        throw err;
      }

      // Admin cannot change owner's role
      if (membership.role === 'owner' && requesterRole !== 'owner') {
        const err = new Error('Forbidden: Admins cannot modify or demote an organization owner');
        err.status = 403;
        err.code = 'FORBIDDEN_CANNOT_DEMOTE_OWNER';
        throw err;
      }

      // Admin cannot promote someone to owner
      if (newRole === 'owner' && requesterRole !== 'owner') {
        const err = new Error('Forbidden: Admins cannot promote members to organization owner');
        err.status = 403;
        err.code = 'FORBIDDEN_CANNOT_ASSIGN_OWNER';
        throw err;
      }

      membership.role = newRole;
      membership.updated_at = new Date().toISOString();
      return membership;
    }

    // Production Supabase Query
    const { data: targetMem, error: findError } = await supabaseAdmin
      .from('organization_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .single();

    if (findError || !targetMem) {
      const err = new Error('Organization membership not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (targetMem.user_id === requesterUserId) {
      const err = new Error(
        'Privilege Escalation Blocked: You cannot modify your own organization role'
      );
      err.status = 403;
      err.code = 'FORBIDDEN_SELF_ROLE_ELEVATION';
      throw err;
    }

    if (targetMem.role === 'owner' && requesterRole !== 'owner') {
      const err = new Error('Forbidden: Admins cannot modify an organization owner');
      err.status = 403;
      err.code = 'FORBIDDEN_CANNOT_DEMOTE_OWNER';
      throw err;
    }

    if (newRole === 'owner' && requesterRole !== 'owner') {
      const err = new Error('Forbidden: Admins cannot promote members to owner');
      err.status = 403;
      err.code = 'FORBIDDEN_CANNOT_ASSIGN_OWNER';
      throw err;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('organization_members')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated;
  }
};

export default organizationService;
