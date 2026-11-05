import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2, 'Task title must be at least 2 characters').max(255),
  description: z.string().trim().optional(),
  category: z.string().trim().default('Maintenance'),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  column_name: z.enum(['todo', 'in_progress', 'review', 'completed']).default('todo'),
  due_date: z.string().trim().min(1, 'Due date is required'),
  project_id: z.string().trim().optional().nullable(),
  assigned_to: z.string().trim().optional().nullable(),
  checklist_total: z.coerce.number().min(0).default(0),
  checklist_completed: z.coerce.number().min(0).default(0)
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskCommentSchema = z.object({
  comment_text: z.string().trim().min(1, 'Comment text is required').max(5000)
});

export const taskAttachmentSchema = z.object({
  file_name: z.string().trim().min(1, 'File name is required').max(255),
  file_url: z.string().trim().min(1, 'File URL or storage path is required'),
  file_size: z.coerce.number().min(0).default(1024),
  mime_type: z.string().trim().default('application/pdf')
});
