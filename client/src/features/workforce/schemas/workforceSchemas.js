import { z } from 'zod';

export const employeeCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  role: z.enum(['admin', 'manager', 'employee'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
  job_title: z
    .string()
    .min(1, 'Job title is required')
    .min(2, 'Job title must be at least 2 characters'),
  department: z.string().optional().default('Operations'),
  hourly_rate: z.coerce.number().min(0, 'Hourly rate cannot be negative').optional()
});

export const employeeUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  job_title: z.string().min(2, 'Job title must be at least 2 characters').optional(),
  department: z.string().optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
  is_active: z.boolean().optional()
});

export const workforceFilterSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});
