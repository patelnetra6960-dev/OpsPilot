import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class OrganizationRepository extends BaseRepository {
  constructor() {
    super('organizations', 'organizations');
  }

  /**
   * Find organizations where user is an active member
   */
  async findByUserId(userId) {
    if (env.isMockMode || !supabaseAdmin) {
      const userMemberships = (mockDatabase.memberships || []).filter(
        (m) => m.user_id === userId && m.status === 'active'
      );
      const orgIds = userMemberships.map((m) => m.organization_id);
      return (mockDatabase.organizations || [])
        .filter((org) => orgIds.includes(org.id) && !org.deleted_at)
        .map((org) => {
          const membership = userMemberships.find((m) => m.organization_id === org.id);
          return {
            ...org,
            role: membership?.role || 'member'
          };
        });
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
  }

  /**
   * Find organization members
   */
  async findMembers(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const memberships = (mockDatabase.memberships || []).filter(
        (m) => m.organization_id === organizationId
      );
      return memberships.map((m) => {
        const user = (mockDatabase.users || []).find((u) => u.id === m.user_id) || {
          email: 'unknown'
        };
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
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data;
  }
}

export const organizationRepository = new OrganizationRepository();
export default organizationRepository;
