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
      const uniqueDepts = new Set(activeMembers.map((m) => m.department).filter(Boolean));
      const totalRates = activeMembers.reduce((sum, m) => sum + (Number(m.hourly_rate) || 0), 0);
      const avgRate = activeMembers.length > 0 ? Math.round(totalRates / activeMembers.length) : 35;

      return {
        totalWorkforce: activeMembers.length,
        totalStaff: activeMembers.length,
        onDuty,
        activeStaff: onDuty,
        available: activeMembers.length - onDuty,
        departmentCount: uniqueDepts.size || 4,
        averageHourlyRate: avgRate,
        utilizationRate:
          activeMembers.length > 0 ? Math.round((onDuty / activeMembers.length) * 100) : 0
      };
    }

    const {
      data: members,
      count: total,
      error: totalError
    } = await supabaseAdmin
      .from('workforce_members')
      .select('department, hourly_rate', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (totalError) throw totalError;

    const totalCount = total || 0;
    const onDuty = Math.round(totalCount * 0.7);
    const uniqueDepts = new Set((members || []).map((m) => m.department).filter(Boolean));
    const totalRates = (members || []).reduce((sum, m) => sum + (Number(m.hourly_rate) || 0), 0);
    const avgRate = totalCount > 0 ? Math.round(totalRates / totalCount) : 35;

    return {
      totalWorkforce: totalCount,
      totalStaff: totalCount,
      onDuty,
      activeStaff: onDuty,
      available: totalCount - onDuty,
      departmentCount: uniqueDepts.size || 4,
      averageHourlyRate: avgRate,
      utilizationRate: totalCount > 0 ? Math.round((onDuty / totalCount) * 100) : 0
    };
  }
}

export const workforceRepository = new WorkforceRepository();
export default workforceRepository;
