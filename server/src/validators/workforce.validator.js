import { z } from 'zod';

export const createWorkforceSchema = z.object({
  employee_code: z.string().min(2, 'Employee code must be at least 2 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().optional(),
  department_id: z.string().optional().nullable(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  hourly_rate: z.number().min(0).optional(),
  skills: z.array(z.string()).optional(),
  manager_id: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
  role: z.enum(['admin', 'manager', 'employee', 'customer', 'member']).optional()
});

export const updateWorkforceSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department_id: z.string().optional().nullable(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  hourly_rate: z.number().min(0).optional(),
  skills: z.array(z.string()).optional(),
  manager_id: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional()
});

export const assignDepartmentSchema = z.object({
  department_id: z.string().min(1, 'Department ID is required'),
  department: z.string().optional()
});

export const assignManagerSchema = z.object({
  manager_id: z.string().min(1, 'Manager ID is required').nullable()
});

export const updateEmployeeRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'employee', 'customer', 'member'])
});

export const workforceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  department: z.string().optional(),
  department_id: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']).optional(),
  manager_id: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'first_name', 'last_name', 'employee_code', 'hourly_rate'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export default {
  createWorkforceSchema,
  updateWorkforceSchema,
  assignDepartmentSchema,
  assignManagerSchema,
  updateEmployeeRoleSchema,
  workforceQuerySchema
};
