import storageService from '../services/storage.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const storageController = {
  /**
   * 1. Upload file to tenant storage
   */
  uploadFile: asyncHandler(async (req, res) => {
    const { bucket, category, fileName, fileData, mimeType, fileSize } = req.body;

    if (!bucket || !fileName) {
      return sendError(
        res,
        'Both bucket and fileName are required for upload',
        400,
        'VALIDATION_ERROR'
      );
    }

    let fileBuffer = null;
    if (fileData) {
      fileBuffer = Buffer.from(fileData, 'base64');
    }

    const result = await storageService.uploadFile({
      organizationId: req.tenant.id,
      userId: req.user.id,
      userRole: req.membership.role,
      isSuperadmin: req.user.is_superadmin,
      bucket,
      category: category || 'general',
      fileName,
      fileBuffer,
      mimeType: mimeType || 'application/octet-stream',
      fileSize: fileSize || (fileBuffer ? fileBuffer.length : 0)
    });

    return sendSuccess(res, result, result.message, 201);
  }),

  /**
   * 2. Generate secure signed URL for private document download
   */
  createSignedUrl: asyncHandler(async (req, res) => {
    const { bucket, filePath, expiresIn } = req.body;

    if (!bucket || !filePath) {
      return sendError(
        res,
        'Both bucket and filePath are required to generate signed URL',
        400,
        'VALIDATION_ERROR'
      );
    }

    const result = await storageService.generateSignedUrl({
      organizationId: req.tenant.id,
      userId: req.user.id,
      userRole: req.membership.role,
      isSuperadmin: req.user.is_superadmin,
      bucket,
      filePath,
      expiresIn: expiresIn ? parseInt(expiresIn, 10) : 900
    });

    return sendSuccess(res, result, 'Signed URL generated successfully');
  }),

  /**
   * 3. Download / Stream private storage file
   */
  downloadFile: asyncHandler(async (req, res) => {
    const { bucket } = req.params;
    const rawPath = req.params[0] || req.query.path || '';
    const filePath = rawPath.replace(/^\/+/, '');

    if (!bucket || !filePath) {
      return sendError(res, 'Bucket and file path are required', 400, 'VALIDATION_ERROR');
    }

    const result = await storageService.generateSignedUrl({
      organizationId: req.tenant.id,
      userId: req.user.id,
      userRole: req.membership.role,
      isSuperadmin: req.user.is_superadmin,
      bucket,
      filePath,
      expiresIn: 300
    });

    return res.redirect(result.signedUrl);
  }),

  /**
   * 4. Delete storage file
   */
  deleteFile: asyncHandler(async (req, res) => {
    const { bucket } = req.params;
    const rawPath = req.params[0] || req.body.filePath || '';
    const filePath = rawPath.replace(/^\/+/, '');

    if (!bucket || !filePath) {
      return sendError(
        res,
        'Bucket and file path are required for deletion',
        400,
        'VALIDATION_ERROR'
      );
    }

    const result = await storageService.deleteFile({
      organizationId: req.tenant.id,
      userId: req.user.id,
      userRole: req.membership.role,
      isSuperadmin: req.user.is_superadmin,
      bucket,
      filePath
    });

    return sendSuccess(res, result, result.message);
  }),

  /**
   * 5. List files in tenant partition
   */
  listFiles: asyncHandler(async (req, res) => {
    const { bucket } = req.params;
    const { category } = req.query;

    const files = await storageService.listFiles({
      organizationId: req.tenant.id,
      userRole: req.membership.role,
      isSuperadmin: req.user.is_superadmin,
      bucket,
      category
    });

    return sendSuccess(res, files, 'Files fetched successfully');
  })
};

export default storageController;
