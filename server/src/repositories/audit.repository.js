import BaseRepository from './base.repository.js';
import { recordAuditLog } from '../utils/supabaseHelpers.js';

export class AuditRepository extends BaseRepository {
  constructor() {
    super('audit_logs', 'auditLogs');
  }

  /**
   * Append an immutable audit event
   */
  async logEvent(params) {
    return recordAuditLog(params);
  }
}

export const auditRepository = new AuditRepository();
export default auditRepository;
