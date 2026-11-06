import { analyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class AnalyticsController {
  getUserContext(req) {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      role:
        req.membership?.role ||
        req.userRole ||
        req.userContext?.role ||
        req.member?.role ||
        req.user?.role ||
        'employee',
      isSuperAdmin: Boolean(req.user?.is_superadmin),
      organizationId: req.tenant?.id || req.organizationId || req.userContext?.organizationId
    };
  }

  /**
   * GET /api/v1/analytics/organization
   */
  getOrganizationDashboard = asyncHandler(async (req, res) => {
    const userContext = this.getUserContext(req);
    const organizationId = userContext.organizationId;
    const data = await analyticsService.getOrganizationDashboard(
      organizationId,
      req.query,
      userContext
    );
    return sendSuccess(res, data, 'Organization analytics retrieved successfully');
  });

  /**
   * GET /api/v1/analytics/manager
   */
  getManagerDashboard = asyncHandler(async (req, res) => {
    const userContext = this.getUserContext(req);
    const organizationId = userContext.organizationId;
    const data = await analyticsService.getManagerDashboard(
      organizationId,
      req.query,
      userContext
    );
    return sendSuccess(res, data, 'Manager analytics retrieved successfully');
  });

  /**
   * GET /api/v1/analytics/platform
   */
  getSuperAdminDashboard = asyncHandler(async (req, res) => {
    const userContext = this.getUserContext(req);
    const data = await analyticsService.getSuperAdminDashboard(req.query, userContext);
    return sendSuccess(res, data, 'Super Admin platform analytics retrieved successfully');
  });

  /**
   * GET /api/v1/analytics/export
   */
  exportAnalyticsReport = asyncHandler(async (req, res) => {
    const userContext = this.getUserContext(req);
    const organizationId = userContext.organizationId;
    const { filename, contentType, data } = await analyticsService.exportReport(
      organizationId,
      req.query,
      userContext
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(data);
  });
}

export const analyticsController = new AnalyticsController();
export default analyticsController;
