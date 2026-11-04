import authService from './auth.service.js';
import organizationService from '../organizations/organization.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';

export const authController = {
  /**
   * 1. Register new user
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 2. Log in with email and password
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 3. Log out current session
   */
  async logout(req, res, next) {
    try {
      const token =
        req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
      const result = await authService.logout(token);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 4. Verify email address
   */
  async verifyEmail(req, res, next) {
    try {
      const result = await authService.verifyEmail(req.body);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 5. Initiate password recovery
   */
  async recoverPassword(req, res, next) {
    try {
      const result = await authService.recoverPassword(req.body);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 6. Complete password reset
   */
  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword({
        ...req.body,
        userId: req.user?.id
      });
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 7. Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req.body);
      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * 8. Get current authenticated user profile & affiliated organizations
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
