import organizationService from './organization.service.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import { z } from 'zod';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  subscription_tier: z.enum(['starter', 'growth', 'enterprise']).optional(),
  settings: z.record(z.any()).optional()
});

export const organizationController = {
  /**
   * List all organizations for the currently authenticated user
   */
  async getMyOrganizations(req, res, next) {
    try {
      const organizations = await organizationService.getUserOrganizations(req.user.id);
      return sendSuccess(res, organizations, 'User organizations fetched successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new organization
   */
  async createOrganization(req, res, next) {
    try {
      const validation = createOrgSchema.safeParse(req.body);
      if (!validation.success) {
        return sendError(
          res,
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.format()
        );
      }

      const organization = await organizationService.createOrganization(
        validation.data,
        req.user.id
      );
      return sendSuccess(res, organization, 'Organization created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current active organization details (requires requireTenant middleware)
   */
  async getCurrentOrganization(req, res, next) {
    try {
      return sendSuccess(
        res,
        {
          organization: req.tenant,
          membership: req.membership
        },
        'Current organization details fetched'
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * List members of the current active organization
   */
  async getMembers(req, res, next) {
    try {
      const members = await organizationService.getOrganizationMembers(req.tenant.id);
      return sendSuccess(res, members, 'Organization members fetched');
    } catch (error) {
      next(error);
    }
  }
};

export default organizationController;
