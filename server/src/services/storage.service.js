import {
  validateStorageUpload,
  createSignedStorageUrl,
  deleteStorageFile,
  recordAuditLog
} from '../utils/supabaseHelpers.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// Initialize mock storage files array if needed
if (!mockDatabase.storageFiles) {
  mockDatabase.storageFiles = [];
}

export const storageService = {
  /**
   * 1. Upload a file to an organization-partitioned storage bucket
   */
  async uploadFile({
    organizationId,
    userId,
    userRole,
    isSuperadmin = false,
    bucket,
    category = 'general',
    fileName,
    fileBuffer,
    mimeType,
    fileSize
  }) {
    if (!organizationId) {
      const err = new Error('organizationId is required for storage operations');
      err.status = 400;
      err.code = 'TENANT_ID_REQUIRED';
      throw err;
    }

    // Role-based bucket upload authorization
    if (!isSuperadmin) {
      if (userRole === 'customer') {
        if (['org-documents', 'project-files', 'invoice-documents'].includes(bucket)) {
          const err = new Error(`Customer accounts cannot upload to '${bucket}'`);
          err.status = 403;
          err.code = 'FORBIDDEN_STORAGE_ACTION';
          throw err;
        }
      } else if (userRole === 'employee') {
        if (bucket === 'invoice-documents') {
          const err = new Error('Employees are not authorized to upload invoice documents');
          err.status = 403;
          err.code = 'FORBIDDEN_STORAGE_ACTION';
          throw err;
        }
      }
    }

    const validation = validateStorageUpload({
      bucket,
      fileName,
      fileSize: fileSize || (fileBuffer ? fileBuffer.length : 1024),
      mimeType
    });

    if (!validation.isValid) {
      const err = new Error(validation.error);
      err.status = 400;
      err.code = validation.code;
      throw err;
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${organizationId}/${category}/${cleanFileName}`;

    // Mock Mode Storage
    if (env.isMockMode || !supabaseAdmin) {
      const mockRecord = {
        id: `mock-file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bucket,
        storagePath,
        fileName: cleanFileName,
        category,
        organizationId,
        size: fileSize || 1024,
        mimeType: mimeType || 'application/octet-stream',
        uploadedBy: userId,
        createdAt: new Date().toISOString()
      };

      const existingIdx = mockDatabase.storageFiles.findIndex(
        (f) => f.bucket === bucket && f.storagePath === storagePath
      );
      if (existingIdx >= 0) {
        mockDatabase.storageFiles[existingIdx] = mockRecord;
      } else {
        mockDatabase.storageFiles.push(mockRecord);
      }

      await recordAuditLog({
        organizationId,
        userId,
        action: 'storage.file_uploaded',
        entityType: 'storage_object',
        entityId: storagePath,
        newValues: { bucket, storagePath, size: mockRecord.size, mimeType }
      });

      const { signedUrl, expiresAt } = await createSignedStorageUrl(bucket, storagePath);

      return {
        bucket,
        storagePath,
        fileName: cleanFileName,
        size: mockRecord.size,
        mimeType: mockRecord.mimeType,
        signedUrl,
        expiresAt,
        message: 'File uploaded successfully'
      };
    }

    // Production Supabase Storage Upload
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, fileBuffer || Buffer.from(''), {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      logger.error(`Failed to upload file to ${bucket}/${storagePath}:`, error);
      const err = new Error(error.message);
      err.status = 500;
      err.code = 'STORAGE_UPLOAD_ERROR';
      throw err;
    }

    await recordAuditLog({
      organizationId,
      userId,
      action: 'storage.file_uploaded',
      entityType: 'storage_object',
      entityId: storagePath,
      newValues: { bucket, storagePath, mimeType }
    });

    const { signedUrl, expiresAt } = await createSignedStorageUrl(bucket, storagePath);

    return {
      bucket,
      storagePath: data.path || storagePath,
      fileName: cleanFileName,
      signedUrl,
      expiresAt,
      message: 'File uploaded successfully'
    };
  },

  /**
   * 2. Generate a secure time-limited signed URL for private file access
   */
  async generateSignedUrl({
    organizationId,
    userId,
    userRole,
    isSuperadmin = false,
    bucket,
    filePath,
    expiresIn = 900
  }) {
    if (!filePath || !bucket) {
      const err = new Error('Both bucket and filePath are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!isSuperadmin) {
      const pathPrefix = filePath.split('/')[0];
      if (pathPrefix !== organizationId) {
        logger.warn(
          `Cross-tenant storage access attempted: User ${userId} tried accessing ${filePath} for Org ${organizationId}`
        );
        const err = new Error(
          'Access Denied: You cannot access storage assets from another organization'
        );
        err.status = 403;
        err.code = 'FORBIDDEN_CROSS_TENANT_ACCESS';
        throw err;
      }

      if (userRole === 'customer') {
        if (['org-documents', 'project-files'].includes(bucket)) {
          const err = new Error(`Customer accounts cannot access files in '${bucket}'`);
          err.status = 403;
          err.code = 'FORBIDDEN_STORAGE_ACTION';
          throw err;
        }
      } else if (userRole === 'employee') {
        if (bucket === 'invoice-documents') {
          const err = new Error('Employees are not authorized to view invoice documents');
          err.status = 403;
          err.code = 'FORBIDDEN_STORAGE_ACTION';
          throw err;
        }
      }
    }

    const { signedUrl, expiresAt } = await createSignedStorageUrl(bucket, filePath, expiresIn);

    return {
      bucket,
      filePath,
      signedUrl,
      expiresAt
    };
  },

  /**
   * 3. Delete an organization-owned storage file
   */
  async deleteFile({ organizationId, userId, userRole, isSuperadmin = false, bucket, filePath }) {
    if (!filePath || !bucket) {
      const err = new Error('Both bucket and filePath are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!isSuperadmin) {
      const pathPrefix = filePath.split('/')[0];
      if (pathPrefix !== organizationId) {
        const err = new Error('Access Denied: You cannot delete files from another organization');
        err.status = 403;
        err.code = 'FORBIDDEN_CROSS_TENANT_ACCESS';
        throw err;
      }

      if (!['owner', 'admin', 'manager'].includes(userRole)) {
        const err = new Error(
          'Forbidden: Deleting storage files requires Manager or Administrator privileges'
        );
        err.status = 403;
        err.code = 'INSUFFICIENT_ROLE_PERMISSIONS';
        throw err;
      }
    }

    await deleteStorageFile(bucket, filePath);

    if (env.isMockMode || !supabaseAdmin) {
      mockDatabase.storageFiles = (mockDatabase.storageFiles || []).filter(
        (f) => !(f.bucket === bucket && f.storagePath === filePath)
      );
    }

    await recordAuditLog({
      organizationId,
      userId,
      action: 'storage.file_deleted',
      entityType: 'storage_object',
      entityId: filePath,
      oldValues: { bucket, filePath }
    });

    return {
      success: true,
      bucket,
      filePath,
      message: 'File deleted successfully'
    };
  },

  /**
   * 4. List files within an organization's partition
   */
  async listFiles({ organizationId, userRole, isSuperadmin = false, bucket, category }) {
    if (!isSuperadmin) {
      if (userRole === 'customer' && ['org-documents', 'project-files'].includes(bucket)) {
        return [];
      }
      if (userRole === 'employee' && bucket === 'invoice-documents') {
        return [];
      }
    }

    if (env.isMockMode || !supabaseAdmin) {
      let filtered = (mockDatabase.storageFiles || []).filter(
        (f) => f.bucket === bucket && f.organizationId === organizationId
      );
      if (category) {
        filtered = filtered.filter((f) => f.category === category);
      }
      return filtered;
    }

    const folderPrefix = category ? `${organizationId}/${category}` : organizationId;
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(folderPrefix, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

    if (error) {
      logger.error(`Error listing files in ${bucket}/${folderPrefix}:`, error);
      throw error;
    }

    return (data || []).map((file) => ({
      name: file.name,
      id: file.id,
      size: file.metadata?.size || 0,
      mimeType: file.metadata?.mimetype || 'application/octet-stream',
      createdAt: file.created_at,
      filePath: `${folderPrefix}/${file.name}`
    }));
  }
};

export default storageService;
