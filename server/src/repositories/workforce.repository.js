import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class WorkforceRepository extends BaseRepository {
  constructor() {
    super('workforce_members', 'workforce');
  }

  /**
   * Find workforce stats aggregated for organization
   */
  async getOperationalStats(organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const activeMembers = (mockDatabase.workforce || []).filter(
        (m) => m.organization_id === organizationId && m.status === 'active' && !m.deleted_at
      );
      const onDuty = Math.round(activeMembers.length * 0.7);
      return {
        totalWorkforce: activeMembers.length,
        onDuty,
        available: activeMembers.length - onDuty,
        utilizationRate:
          activeMembers.length > 0 ? Math.round((onDuty / activeMembers.length) * 100) : 0
      };
    }

    const { count: total, error: totalError } = await supabaseAdmin
      .from('workforce_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (totalError) throw totalError;

    const onDuty = Math.round((total || 0) * 0.7);
    return {
      totalWorkforce: total || 0,
      onDuty,
      available: (total || 0) - onDuty,
      utilizationRate: (total || 0) > 0 ? Math.round((onDuty / (total || 1)) * 100) : 0
    };
  }
}

export const workforceRepository = new WorkforceRepository();
export default workforceRepository;
