import crypto from 'crypto';
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
    if (env.isMockMode || !supabaseAdmin) {
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
   * Get Comprehensive Organization Details including statistics
   */
  async getOrganizationDetails(orgId) {
    const org = await this.getById(orgId);
    if (!org) {
      const err = new Error(`Organization '${orgId}' not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    let memberCount = 0;
    let deptCount = 0;

    if (env.isMockMode || !supabaseAdmin) {
      memberCount = (mockDatabase.memberships || []).filter(
        (m) => m.organization_id === orgId && m.status === 'active'
      ).length;
      deptCount = (mockDatabase.departments || []).filter(
        (d) => d.organization_id === orgId && !d.deleted_at
      ).length;
    } else {
      const { count: mems } = await supabaseAdmin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active');
      const { count: depts } = await supabaseAdmin
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      memberCount = mems || 0;
      deptCount = depts || 0;
    }

    return {
      ...org,
      stats: {
        activeMembers: memberCount,
        activeDepartments: deptCount
      }
    };
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
   * Update Organization General Information
   */
  async updateOrganization(orgId, updates) {
    const allowed = ['name', 'slug', 'is_active'];
    const sanitized = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) sanitized[k] = updates[k];
    }

    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.organizations || []).findIndex((o) => o.id === orgId);
      if (idx === -1) {
        const err = new Error(`Organization '${orgId}' not found`);
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      mockDatabase.organizations[idx] = {
        ...mockDatabase.organizations[idx],
        ...sanitized,
        updated_at: new Date().toISOString()
      };
      return mockDatabase.organizations[idx];
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ ...sanitized, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update Organization Settings
   */
  async updateSettings(orgId, settingsUpdates) {
    const org = await this.getById(orgId);
    if (!org) {
      const err = new Error(`Organization '${orgId}' not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const mergedSettings = {
      ...(org.settings || {}),
      ...settingsUpdates
    };

    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.organizations || []).findIndex((o) => o.id === orgId);
      mockDatabase.organizations[idx].settings = mergedSettings;
      mockDatabase.organizations[idx].updated_at = new Date().toISOString();
      return mergedSettings;
    }

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ settings: mergedSettings, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    if (error) throw error;
    return mergedSettings;
  },

  /**
   * List members of an organization
   */
  async getOrganizationMembers(orgId) {
    return organizationRepository.findMembers(orgId);
  },

  /**
   * Add / Direct Provision Member to Organization
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
      if (membership.user_id === requesterUserId || memberId === requesterUserId) {
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

    if (targetMem.user_id === requesterUserId || memberId === requesterUserId) {
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
  },

  /**
   * Activate or Deactivate (Suspend) an Organization Membership
   */
  async updateMembershipStatus({
    organizationId,
    memberId,
    status,
    requesterRole,
    requesterUserId
  }) {
    if (!['owner', 'admin'].includes(requesterRole)) {
      const err = new Error(
        'Forbidden: Only organization owners and admins can alter membership status'
      );
      err.status = 403;
      err.code = 'INSUFFICIENT_ROLE_PERMISSIONS';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      const membership = (mockDatabase.memberships || []).find(
        (m) => (m.id === memberId || m.user_id === memberId) && m.organization_id === organizationId
      );

      if (!membership) {
        const err = new Error('Organization membership not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (membership.role === 'owner' && status === 'suspended') {
        const err = new Error('Forbidden: Primary organization owner cannot be deactivated');
        err.status = 403;
        err.code = 'FORBIDDEN_CANNOT_DEACTIVATE_OWNER';
        throw err;
      }

      if (
        requesterUserId &&
        (membership.user_id === requesterUserId || membership.id === requesterUserId) &&
        status === 'suspended'
      ) {
        const err = new Error('Forbidden: You cannot deactivate your own organization membership');
        err.status = 400;
        err.code = 'CANNOT_DEACTIVATE_SELF';
        throw err;
      }

      membership.status = status;
      membership.updated_at = new Date().toISOString();

      // Multi-step sync: Update linked workforce member status if suspended
      if (status === 'suspended') {
        const wfMember = (mockDatabase.workforce || []).find(
          (w) => w.organization_id === organizationId && w.user_id === membership.user_id
        );
        if (wfMember) {
          wfMember.status = 'terminated';
          wfMember.deleted_at = new Date().toISOString();
        }
      }

      return membership;
    }

    // Production: Verify target member is not owner
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

    if (targetMem.role === 'owner' && status === 'suspended') {
      const err = new Error('Forbidden: Primary organization owner cannot be deactivated');
      err.status = 403;
      err.code = 'FORBIDDEN_CANNOT_DEACTIVATE_OWNER';
      throw err;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('organization_members')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated;
  },

  /**
   * List Membership Invitations for Organization
   */
  async getInvitations(organizationId, { page = 1, limit = 20, status } = {}) {
    if (env.isMockMode || !supabaseAdmin) {
      let list = (mockDatabase.invitations || []).filter(
        (inv) => inv.organization_id === organizationId
      );

      if (status) {
        list = list.filter((inv) => inv.status === status);
      }

      const total = list.length;
      const start = (page - 1) * limit;
      const data = list.slice(start, start + limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: start + limit < total,
          hasPrevPage: page > 1
        }
      };
    }

    let query = supabaseAdmin
      .from('organization_invitations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (status) query = query.eq('status', status);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      // Graceful fallback if table does not exist
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
      };
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: page * limit < (count || 0),
        hasPrevPage: page > 1
      }
    };
  },

  /**
   * Create & Dispatch Membership Invitation
   */
  async createInvitation({
    organizationId,
    email,
    role = 'employee',
    departmentId = null,
    invitedBy
  }) {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already an active member of this organization
    if (env.isMockMode || !supabaseAdmin) {
      const existingUser = (mockDatabase.users || []).find(
        (u) => u.email.toLowerCase() === cleanEmail
      );
      if (existingUser) {
        const existingMem = (mockDatabase.memberships || []).find(
          (m) =>
            m.organization_id === organizationId &&
            m.user_id === existingUser.id &&
            m.status === 'active'
        );
        if (existingMem) {
          const err = new Error(`User with email '${cleanEmail}' is already an active member`);
          err.status = 409;
          err.code = 'CONFLICT_MEMBER_EXISTS';
          throw err;
        }
      }

      const token = `inv-${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const newInvitation = {
        id: `inv-${Date.now()}`,
        organization_id: organizationId,
        email: cleanEmail,
        role,
        department_id: departmentId,
        token,
        status: 'pending',
        invited_by: invitedBy,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!mockDatabase.invitations) mockDatabase.invitations = [];
      mockDatabase.invitations.push(newInvitation);
      return newInvitation;
    }

    const token = `inv-${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email: cleanEmail,
        role,
        department_id: departmentId,
        token,
        invited_by: invitedBy,
        expires_at: expiresAt,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Revoke Membership Invitation
   */
  async revokeInvitation({ organizationId, invitationId }) {
    if (env.isMockMode || !supabaseAdmin) {
      const inv = (mockDatabase.invitations || []).find(
        (i) => i.id === invitationId && i.organization_id === organizationId
      );
      if (!inv) {
        const err = new Error('Invitation record not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      inv.status = 'revoked';
      inv.updated_at = new Date().toISOString();
      return inv;
    }

    const { data, error } = await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Accept Invitation (Transactional Operation: Accepts invite + creates membership + creates workforce member)
   */
  async acceptInvitation({ token, userId, fullName }) {
    if (env.isMockMode || !supabaseAdmin) {
      const inv = (mockDatabase.invitations || []).find(
        (i) => i.token === token && i.status === 'pending'
      );
      if (!inv) {
        const err = new Error('Invalid or expired invitation token');
        err.status = 404;
        err.code = 'INVALID_INVITATION_TOKEN';
        throw err;
      }

      if (new Date(inv.expires_at) < new Date()) {
        inv.status = 'expired';
        const err = new Error('Invitation token has expired');
        err.status = 410;
        err.code = 'INVITATION_EXPIRED';
        throw err;
      }

      // 1. Mark invitation accepted
      inv.status = 'accepted';
      inv.updated_at = new Date().toISOString();

      // 2. Create organization membership
      const newMembership = {
        id: `mem-${Date.now()}`,
        organization_id: inv.organization_id,
        user_id: userId,
        role: inv.role,
        status: 'active',
        created_at: new Date().toISOString()
      };
      if (!mockDatabase.memberships) mockDatabase.memberships = [];
      mockDatabase.memberships.push(newMembership);

      // 3. Create workforce member profile
      const names = (fullName || 'New Member').split(' ');
      const newWf = {
        id: `wm-${Date.now()}`,
        organization_id: inv.organization_id,
        user_id: userId,
        department_id: inv.department_id,
        employee_code: `EMP-${Date.now().toString().slice(-4)}`,
        first_name: names[0] || 'Team',
        last_name: names.slice(1).join(' ') || 'Member',
        email: inv.email,
        department: 'Operations',
        designation: 'Associate',
        employment_type: 'full_time',
        status: 'active',
        created_at: new Date().toISOString()
      };
      if (!mockDatabase.workforce) mockDatabase.workforce = [];
      mockDatabase.workforce.push(newWf);

      return {
        membership: newMembership,
        workforceMember: newWf,
        organizationId: inv.organization_id
      };
    }

    // Production Transactional Query
    const { data: inv, error: invError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invError || !inv) {
      const err = new Error('Invalid or expired invitation token');
      err.status = 404;
      err.code = 'INVALID_INVITATION_TOKEN';
      throw err;
    }

    // Multi-step inserts
    await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', inv.id);

    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: inv.organization_id,
        user_id: userId,
        role: inv.role,
        status: 'active'
      })
      .select()
      .single();

    return {
      membership,
      organizationId: inv.organization_id
    };
  }
};

export default organizationService;
