import authService from '../services/auth.service.js';
import organizationService from '../services/organization.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const authController = {
  /**
   * 1. Register new user
   */
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, result.message, 201);
  }),

  /**
   * 2. Log in with email and password
   */
  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    return sendSuccess(res, result, result.message);
  }),

  /**
   * 3. Log out current session
   */
  logout: asyncHandler(async (req, res) => {
    const token =
      req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    const result = await authService.logout(token);
    return sendSuccess(res, result, result.message);
  }),

  /**
   * 4. Verify email address
   */
  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body);
    return sendSuccess(res, result, result.message);
  }),

  /**
   * 5. Initiate password recovery
   */
  recoverPassword: asyncHandler(async (req, res) => {
    const result = await authService.recoverPassword(req.body);
    return sendSuccess(res, result, result.message);
  }),

  /**
   * 6. Complete password reset
   */
  resetPassword: asyncHandler(async (req, res) => {
    const result = await authService.resetPassword({
      ...req.body,
      userId: req.user?.id
    });
    return sendSuccess(res, result, result.message);
  }),

  /**
   * 7. Refresh access token
   */
  refreshToken: asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body);
    return sendSuccess(res, result, 'Token refreshed successfully');
  }),

  /**
   * 8. Get current authenticated user profile & affiliated organizations
   */
  getMe: asyncHandler(async (req, res) => {
    const organizations = await organizationService.getUserOrganizations(req.user.id);
    return sendSuccess(
      res,
      {
        user: req.user,
        organizations
      },
      'Authenticated user profile loaded'
    );
  }),

  /**
   * 9. Update current authenticated user profile
   */
  updateProfile: asyncHandler(async (req, res) => {
    const updated = await authService.updateProfile(
      req.user.id,
      req.body,
      Boolean(req.user.is_superadmin)
    );
    return sendSuccess(res, updated, 'Profile updated successfully');
  })
};

export default authController;
