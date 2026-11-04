import auditRepository from '../repositories/audit.repository.js';
import { ForbiddenError, TenantIsolationError } from '../utils/errors.js';
import redactSensitive from '../utils/redact.js';
import logger from '../utils/logger.js';

export class AuditService {
  constructor() {
    this.repository = auditRepository;
  }

  /**
   * Retrieves audit logs for active organization.
   * Access is strictly restricted to Organization Owners and Administrators.
   */
  async getOrganizationAuditLogs(organizationId, queryOptions = {}, context = {}) {
    if (!organizationId) {
      throw new TenantIsolationError('organizationId is required for audit log retrieval');
    }

    const role = context.membership?.role;
    const isSuperAdmin = Boolean(context.user?.is_superadmin);

    if (!isSuperAdmin && !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError(
        'Forbidden: Audit log inspection is strictly restricted to organization owners and administrators.'
      );
    }

    return this.repository.findMany(organizationId, queryOptions, context.userToken);
  }

  /**
   * Records a security or domain audit event
   */
  async recordSecurityEvent({
    organizationId,
    userId = null,
    action,
    entityType = 'SECURITY',
    entityId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null
  }) {
    // Redact sensitive credentials from stored change diffs
    const safeOldValues = oldValues ? redactSensitive(oldValues) : null;
    const safeNewValues = newValues ? redactSensitive(newValues) : null;

    logger.security(action, {
      organizationId,
      userId,
      entityType,
      entityId,
      ipAddress
    });

    return this.repository.logEvent({
      organizationId,
      userId,
      action,
      entityType,
      entityId,
      oldValues: safeOldValues,
      newValues: safeNewValues,
      ipAddress,
      userAgent
    });
  }
}

export const auditService = new AuditService();
export default auditService;
