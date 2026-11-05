import { z } from 'zod';
import { createBusinessValidator } from './base.validator.js';

export const createTaskSchema = z.object({
  task_code: z.string().trim().min(2).max(100).optional(),
  title: z.string().trim().min(2, 'Task title must be at least 2 characters').max(255),
  description: z.string().trim().optional().nullable(),
  category: z.string().trim().default('Maintenance'),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  column_name: z.enum(['todo', 'in_progress', 'review', 'completed']).default('todo'),
  assigned_to: z.string().trim().optional().nullable(),
  project_id: z.string().trim().optional().nullable(),
  work_order_id: z.string().trim().optional().nullable(),
  due_date: z.string().trim().optional().nullable(),
  checklist_total: z.coerce.number().min(0).default(0),
  checklist_completed: z.coerce.number().min(0).default(0)
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskStatusTransitionSchema = z.object({
  column_name: z.enum(['todo', 'in_progress', 'review', 'completed'], {
    errorMap: () => ({
      message: "Status must be one of: 'todo', 'in_progress', 'review', 'completed'"
    })
  })
});

export const assignTaskSchema = z.object({
  workforce_member_id: z.string().trim().min(1, 'Workforce member ID is required')
});

export const createTaskCommentSchema = z.object({
  comment_text: z.string().trim().min(1, 'Comment text is required').max(5000)
});

export const createTaskAttachmentSchema = z.object({
  file_name: z.string().trim().min(1, 'File name is required').max(255),
  file_url: z.string().trim().min(1, 'File URL is required'),
  file_size: z.coerce.number().min(0).default(0),
  mime_type: z.string().trim().optional().nullable()
});

export const taskQueryFilterSchema = z.object({
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  column_name: z.enum(['todo', 'in_progress', 'review', 'completed']).optional(),
  project_id: z.string().trim().optional(),
  assigned_to: z.string().trim().optional(),
  category: z.string().trim().optional()
});

export const taskValidator = createBusinessValidator({
  createSchema: createTaskSchema,
  updateSchema: updateTaskSchema,
  customQuerySchema: taskQueryFilterSchema
});

export default taskValidator;
