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
  }
};

export default organizationService;
