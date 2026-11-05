import { z } from 'zod';
import { createBusinessValidator } from './base.validator.js';

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(255),
  project_code: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().optional().nullable(),
  customer_id: z.string().trim().optional().nullable(),
  client: z.string().trim().optional().nullable(),
  status: z
    .enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])
    .default('planning'),
  health: z.enum(['on_track', 'at_risk', 'delayed']).default('on_track'),
  progress: z.coerce.number().min(0).max(100).default(0),
  budget: z.coerce.number().min(0).default(0),
  spent: z.coerce.number().min(0).default(0),
  start_date: z.string().trim().optional().nullable(),
  target_date: z.string().trim().optional().nullable(),
  lead_id: z.string().trim().optional().nullable(),
  lead: z.string().trim().optional().nullable()
});

export const updateProjectSchema = createProjectSchema.partial();

export const addProjectMemberSchema = z.object({
  workforce_member_id: z.string().trim().min(1, 'Workforce member ID is required'),
  project_role: z.string().trim().default('Technician')
});

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(2, 'Milestone title must be at least 2 characters').max(255),
  target_date: z.string().trim().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending')
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const projectQueryFilterSchema = z.object({
  customer_id: z.string().trim().optional(),
  lead_id: z.string().trim().optional(),
  health: z.enum(['on_track', 'at_risk', 'delayed']).optional()
});

export const projectValidator = createBusinessValidator({
  createSchema: createProjectSchema,
  updateSchema: updateProjectSchema,
  customQuerySchema: projectQueryFilterSchema
});

export default projectValidator;
