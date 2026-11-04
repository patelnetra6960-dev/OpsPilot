import workforceService from './workforce.service.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import { z } from 'zod';

const createMemberSchema = z.object({
  employee_code: z.string().min(2),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().default('Operations'),
  designation: z.string().default('Associate'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']).default('full_time'),
  hourly_rate: z.number().optional().default(0)
});

export const workforceController = {
  /**
   * Get workforce directory for current tenant
   */
  async getDirectory(req, res, next) {
    try {
      const { department, status, search } = req.query;
      const workforce = await workforceService.getWorkforce(req.tenant.id, { department, status, search });
      return sendSuccess(res, workforce, `Workforce directory for ${req.tenant.name}`);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new workforce member for current tenant
   */
  async createMember(req, res, next) {
    try {
      const validation = createMemberSchema.safeParse(req.body);
      if (!validation.success) {
        return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', validation.error.format());
      }

      const newMember = await workforceService.createWorkforceMember(req.tenant.id, validation.data);
      return sendSuccess(res, newMember, 'Workforce member added successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get workforce operational dashboard statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await workforceService.getWorkforceStats(req.tenant.id);
      return sendSuccess(res, stats, 'Workforce statistics loaded');
    } catch (error) {
      next(error);
    }
  }
};

export default workforceController;
