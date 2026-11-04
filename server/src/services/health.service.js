import env from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { STORAGE_BUCKETS } from '../utils/supabaseHelpers.js';

export const healthService = {
  /**
   * Evaluates system health, database connectivity, and subsystem statuses
   */
  async getSystemHealth() {
    let databaseStatus = 'mock-operational';
    let dbLatencyMs = 0;

    if (!env.isMockMode && supabaseAdmin) {
      const start = Date.now();
      try {
        const { error } = await supabaseAdmin.from('organizations').select('id').limit(1);
        dbLatencyMs = Date.now() - start;
        databaseStatus = error ? 'degraded' : 'connected';
      } catch {
        databaseStatus = 'disconnected';
      }
    }

    const memoryUsage = process.memoryUsage();

    return {
      status: databaseStatus === 'disconnected' ? 'degraded' : 'healthy',
      service: 'opspilot-server',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      features: {
        multiTenancy: 'active',
        databaseRLS: 'enforced',
        rowLevelSecurity: 'enforced',
        authProvider: 'Supabase Auth',
        storageBuckets: Object.keys(STORAGE_BUCKETS).length
      },
      services: {
        database: {
          provider: 'Supabase PostgreSQL',
          status: databaseStatus,
          latencyMs: dbLatencyMs
        },
        storage: {
          status: 'ready',
          buckets: Object.values(STORAGE_BUCKETS).map((b) => b.id)
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024)
        }
      }
    };
  }
};

export default healthService;
