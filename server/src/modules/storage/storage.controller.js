import storageService from './storage.service.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

export const storageController = {
  /**
   * 1. Upload file to tenant storage
   */
  async uploadFile(req, res, next) {
    try {
      const { bucket, category, fileName, fileData, mimeType, fileSize } = req.body;

      if (!bucket || !fileName) {
        return sendError(
          res,
          'Both bucket and fileName are required for upload',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Convert base64 data to buffer if provided
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * 2. Generate secure signed URL for private document download
   */
  async createSignedUrl(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * 3. Download / Stream private storage file
   */
  async downloadFile(req, res, next) {
    try {
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
        expiresIn: 300 // 5 minutes for direct download
      });

      // Redirect client directly to the secure signed URL
      return res.redirect(result.signedUrl);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 4. Delete storage file
   */
  async deleteFile(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * 5. List files in tenant partition
   */
  async listFiles(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  }
};

export default storageController;
