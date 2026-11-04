import organizationService from '../organizations/organization.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';

export const authController = {
  /**
   * Get current authenticated user profile and their organizations
   */
  async getMe(req, res, next) {
    try {
      const organizations = await organizationService.getUserOrganizations(req.user.id);
      return sendSuccess(
        res,
        {
          user: req.user,
          organizations
        },
        'Authenticated user profile loaded'
      );
    } catch (error) {
      next(error);
    }
  }
};

export default authController;
