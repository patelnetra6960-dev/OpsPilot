import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(255),
  client: z.string().trim().min(2, 'Client name is required').max(255),
  description: z.string().trim().optional(),
  status: z
    .enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])
    .default('planning'),
  health: z.enum(['on_track', 'at_risk', 'delayed']).default('on_track'),
  budget: z.coerce.number().min(0, 'Budget must be a non-negative number').default(0),
  spent: z.coerce.number().min(0).default(0),
  progress: z.coerce.number().min(0).max(100).default(0),
  start_date: z.string().trim().optional(),
  target_date: z.string().trim().min(1, 'Target completion date is required'),
  lead_id: z.string().trim().optional(),
  lead: z.string().trim().optional()
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const projectMemberSchema = z.object({
  workforce_member_id: z.string().trim().min(1, 'Please select a workforce member'),
  project_role: z.string().trim().min(2, 'Project role is required').default('Technician')
});

export const projectMilestoneSchema = z.object({
  title: z.string().trim().min(2, 'Milestone title is required').max(255),
  target_date: z.string().trim().min(1, 'Target completion date is required'),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending')
});
