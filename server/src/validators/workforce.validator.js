import { z } from 'zod';

export const createWorkforceSchema = z.object({
  employee_code: z.string().min(2, 'Employee code must be at least 2 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email address is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract']).optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  hourly_rate: z.number().positive().optional()
});

export const updateWorkforceSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract']).optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  hourly_rate: z.number().positive().optional()
});

export default {
  createWorkforceSchema,
  updateWorkforceSchema
};
