import BaseRepository from './base.repository.js';
import { recordAuditLog } from '../utils/supabaseHelpers.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Enterprise Audit Repository
 * Enforces strict append-only immutability. Updates and deletions are rejected.
 */
export class AuditRepository extends BaseRepository {
  constructor() {
    super('audit_logs', {
      mockKey: 'auditLogs',
      searchFields: ['action', 'entity_type', 'entity_id', 'ip_address'],
      allowedFilterFields: ['user_id', 'action', 'entity_type'],
      allowedSortFields: ['created_at', 'action', 'entity_type']
    });
  }

  /**
   * Append an immutable audit event
   */
  async logEvent(params) {
    return recordAuditLog(params);
  }

  /**
   * Block updating audit records (Immutability Invariant)
   */
  async update() {
    throw new ForbiddenError(
      'Immutability Violation: Audit records are permanently immutable and cannot be updated.'
    );
  }

  /**
   * Block soft-deleting audit records (Immutability Invariant)
   */
  async softDelete() {
    throw new ForbiddenError(
      'Immutability Violation: Audit records are permanently immutable and cannot be deleted.'
    );
  }

  /**
   * Block hard-deleting audit records (Immutability Invariant)
   */
  async deletePermanent() {
    throw new ForbiddenError(
      'Immutability Violation: Audit records are permanently immutable and cannot be deleted.'
    );
  }
}

export const auditRepository = new AuditRepository();
export default auditRepository;
