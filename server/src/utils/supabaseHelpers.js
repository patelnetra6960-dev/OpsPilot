import { supabaseAdmin, getUserSupabaseClient, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import logger from './logger.js';

/**
 * Storage Buckets Configuration & Specifications
 */
export const STORAGE_BUCKETS = {
  ORG_ASSETS: {
    id: 'org-assets',
    name: 'Organization Assets (Logos & Avatars)',
    public: true,
    fileSizeLimit: 5242880, // 5 MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  },
  ORG_DOCUMENTS: {
    id: 'org-documents',
    name: 'Organization Documents',
    public: false,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg'
    ]
  },
  CUSTOMER_ATTACHMENTS: {
    id: 'customer-attachments',
    name: 'Customer Attachments',
    public: false,
    fileSizeLimit: 26214400, // 25 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
  },
  PROJECT_FILES: {
    id: 'project-files',
    name: 'Project Files',
    public: false,
    fileSizeLimit: 104857600, // 100 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },
  WORK_ORDER_PHOTOS: {
    id: 'work-order-photos',
    name: 'Work Order Photographs',
    public: false,
    fileSizeLimit: 26214400, // 25 MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
  },
  INVOICE_DOCUMENTS: {
    id: 'invoice-documents',
    name: 'Invoice Documents',
    public: false,
    fileSizeLimit: 15728640, // 15 MB
    allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
  }
};

/**
 * 1. Client Accessors
 */
export const getAdminClient = () => {
  return supabaseAdmin;
};

export const getUserClient = (userToken) => {
  return getUserSupabaseClient(userToken);
};

/**
 * 2. Query Scoping Helper: Multi-Tenant & Soft-Delete Enforcement
 * Appends organization_id and deleted_at filters to any PostgREST query builder
 */
export const withTenantScope = (query, organizationId, options = {}) => {
  if (!query) throw new Error('Query builder instance is required');
  if (!organizationId) throw new Error('organizationId is required for tenant scoping');

  let scoped = query.eq('organization_id', organizationId);

  if (!options.includeDeleted) {
    scoped = scoped.is('deleted_at', null);
  }

  return scoped;
};

/**
 * 3. Query Pagination Helper
 * Applies deterministic pagination and sorting to PostgREST queries
 */
export const withPagination = (
  query,
  { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = {}
) => {
  if (!query) throw new Error('Query builder instance is required');

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const ascending = String(sortOrder).toLowerCase() === 'asc';

  return query.order(sortBy, { ascending }).range(from, to);
};

/**
 * 4. Audit Log Recorder
 * Safely inserts immutable audit events into public.audit_logs
 */
export const recordAuditLog = async ({
  organizationId,
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    const logEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.auditLogs) {
        mockDatabase.auditLogs = [];
      }
      mockDatabase.auditLogs.push(logEntry);
      return logEntry;
    }

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert(logEntry)
      .select()
      .single();

    if (error) {
      logger.error('Failed to record audit log entry', error);
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Unexpected error recording audit log', err);
    return null;
  }
};

/**
 * 5. Storage Upload Validator
 * Verifies bucket existence, file size limits, and allowed MIME types
 */
export const validateStorageUpload = ({ bucket, fileName, fileSize, mimeType }) => {
  const bucketKey = Object.keys(STORAGE_BUCKETS).find((key) => STORAGE_BUCKETS[key].id === bucket);

  if (!bucketKey) {
    const validBuckets = Object.values(STORAGE_BUCKETS).map((b) => b.id);
    return {
      isValid: false,
      error: `Invalid storage bucket '${bucket}'. Allowed buckets: ${validBuckets.join(', ')}`,
      code: 'INVALID_STORAGE_BUCKET'
    };
  }

  const bucketConfig = STORAGE_BUCKETS[bucketKey];

  if (fileSize && fileSize > bucketConfig.fileSizeLimit) {
    const maxMb = Math.round(bucketConfig.fileSizeLimit / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds maximum allowed limit of ${maxMb}MB for bucket '${bucket}'`,
      code: 'FILE_SIZE_LIMIT_EXCEEDED'
    };
  }

  if (mimeType && !bucketConfig.allowedMimeTypes.includes(mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `MIME type '${mimeType}' is not permitted for bucket '${bucket}'. Allowed types: ${bucketConfig.allowedMimeTypes.join(', ')}`,
      code: 'INVALID_MIME_TYPE'
    };
  }

  const DANGEROUS_EXTENSIONS =
    /\.(exe|bat|cmd|sh|php|phtml|jsp|asp|aspx|cgi|pl|py|ps1|vbs|jar|war|scr)$/i;
  if (DANGEROUS_EXTENSIONS.test(fileName)) {
    return {
      isValid: false,
      error: 'Executable and script file uploads are strictly forbidden for security reasons',
      code: 'FORBIDDEN_FILE_EXTENSION'
    };
  }

  if (
    !fileName ||
    typeof fileName !== 'string' ||
    fileName.includes('..') ||
    fileName.startsWith('/') ||
    fileName.includes('\\')
  ) {
    return {
      isValid: false,
      error: 'Invalid file name. Path traversal characters are strictly prohibited.',
      code: 'INVALID_FILE_NAME'
    };
  }

  return { isValid: true, bucketConfig };
};

/**
 * 6. Secure Time-Limited Signed URL Generator
 * Generates temporary signed URLs for downloading private documents
 */
export const createSignedStorageUrl = async (bucket, filePath, expiresInSeconds = 900) => {
  if (!bucket || !filePath) {
    throw new Error('Both bucket and filePath are required to generate signed URL');
  }

  if (env.isMockMode || !supabaseAdmin) {
    // Generate deterministic mock signed URL
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return {
      signedUrl: `https://mock-opspilot-storage.supabase.co/storage/v1/object/sign/${bucket}/${filePath}?token=mock-signed-${Date.now()}&expires=${encodeURIComponent(expiresAt)}`,
      expiresAt
    };
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    logger.error(`Error creating signed URL for ${bucket}/${filePath}:`, error);
    throw error;
  }

  return {
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
  };
};

/**
 * 7. Storage File Deletion
 */
export const deleteStorageFile = async (bucket, filePath) => {
  if (!bucket || !filePath) {
    throw new Error('Both bucket and filePath are required for deletion');
  }

  if (env.isMockMode || !supabaseAdmin) {
    return { success: true, message: `Mock file ${bucket}/${filePath} deleted` };
  }

  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
  if (error) {
    logger.error(`Error deleting storage object ${bucket}/${filePath}:`, error);
    throw error;
  }

  return { success: true };
};

/**
 * 8. PostgreSQL / Supabase Error Translator
 * Maps raw database codes to standard HTTP status codes and user-friendly messages
 */
export const handleSupabaseError = (error, defaultMessage = 'Database operation failed') => {
  if (!error) return { status: 500, message: defaultMessage, code: 'INTERNAL_SERVER_ERROR' };

  // PostgreSQL unique constraint violation
  if (error.code === '23505') {
    return {
      status: 409,
      message: 'A record with this identifier or unique attribute already exists',
      code: 'CONFLICT_DUPLICATE_RECORD',
      details: error.detail || error.message
    };
  }

  // PostgreSQL foreign key violation
  if (error.code === '23503') {
    return {
      status: 400,
      message: 'Referenced entity does not exist or relation constraint violated',
      code: 'FOREIGN_KEY_VIOLATION',
      details: error.detail || error.message
    };
  }

  // PostgreSQL Row Level Security / Permission Denied
  if (error.code === '42501') {
    return {
      status: 403,
      message: 'Access Denied: Row Level Security policy violated or insufficient permissions',
      code: 'FORBIDDEN_RLS_VIOLATION',
      details: error.message
    };
  }

  // PostgREST single row not found
  if (error.code === 'PGRST116') {
    return {
      status: 404,
      message: 'The requested resource was not found',
      code: 'NOT_FOUND',
      details: error.message
    };
  }

  return {
    status: 500,
    message: defaultMessage,
    code: 'DATABASE_ERROR',
    details: error.message || String(error)
  };
};

/**
 * 9. Resilience Wrapper: Exponential Backoff Retry
 */
export const executeWithRetry = async (operation, maxRetries = 3, backoffMs = 200) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default {
  STORAGE_BUCKETS,
  getAdminClient,
  getUserClient,
  withTenantScope,
  withPagination,
  recordAuditLog,
  validateStorageUpload,
  createSignedStorageUrl,
  deleteStorageFile,
  handleSupabaseError,
  executeWithRetry
};
