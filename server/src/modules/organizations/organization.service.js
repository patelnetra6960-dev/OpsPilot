import { supabaseAdmin, mockDatabase } from '../../config/supabase.js';
import env from '../../config/env.js';

export const organizationService = {
  /**
   * List all organizations where user is an active member
   */
  async getUserOrganizations(userId) {
    if (env.isMockMode) {
      const userMemberships = mockDatabase.memberships.filter(
        (m) => m.user_id === userId && m.status === 'active'
      );
      const orgIds = userMemberships.map((m) => m.organization_id);

      const orgs = mockDatabase.organizations
        .filter((org) => orgIds.includes(org.id))
        .map((org) => {
          const membership = userMemberships.find((m) => m.organization_id === org.id);
          return {
            ...org,
            role: membership?.role || 'member'
          };
        });

      return orgs;
    }

    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select(
        `
        role,
        status,
        organization:organizations (
          id,
          name,
          slug,
          subscription_tier,
          is_active,
          settings,
          created_at
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    return (data || []).map((item) => ({
      ...item.organization,
      role: item.role
    }));
  },

  /**
   * Get organization details by ID
   */
  async getById(orgId) {
    if (env.isMockMode) {
      const org = mockDatabase.organizations.find((o) => o.id === orgId || o.slug === orgId);
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

    if (env.isMockMode) {
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

      mockDatabase.organizations.push(newOrg);
      mockDatabase.memberships.push(newMembership);

      return newOrg;
    }

    // Production: Supabase Transaction / Insert
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
    if (env.isMockMode) {
      const memberships = mockDatabase.memberships.filter((m) => m.organization_id === orgId);
      const members = memberships.map((m) => {
        const user = mockDatabase.users.find((u) => u.id === m.user_id) || { email: 'unknown' };
        return {
          id: m.id,
          role: m.role,
          status: m.status,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url
          }
        };
      });
      return members;
    }

    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select(
        `
        id,
        role,
        status,
        created_at,
        user:users_profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq('organization_id', orgId);

    if (error) throw error;
    return data;
  }
};

export default organizationService;
