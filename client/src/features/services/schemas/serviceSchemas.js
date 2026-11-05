import { z } from 'zod';

export const serviceRequestCreateSchema = z.object({
  title: z
    .string({ required_error: 'Request title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(255),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  service_type: z
    .enum(['repair', 'maintenance', 'safety', 'installation', 'inspection', 'emergency'])
    .default('repair'),
  urgency: z.enum(['low', 'normal', 'high', 'urgent', 'critical']).default('normal'),
  estimated_cost: z.coerce.number().min(0).optional().default(0),
  customer_id: z.string().optional()
});

export const serviceRequestReviewSchema = z.object({
  manager_notes: z.string().max(2000).optional().default('')
});

export const serviceRequestApproveSchema = z.object({
  manager_notes: z.string().max(2000).optional().default('')
});

export const serviceRequestRejectSchema = z.object({
  rejection_reason: z
    .string({ required_error: 'Rejection reason is required' })
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(2000)
});

export const serviceRequestConvertSchema = z.object({
  title: z.string().min(3).optional(),
  assigned_to: z.string().optional(),
  site: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  cost_estimate: z.coerce.number().min(0).optional()
});

export const workOrderCreateSchema = z.object({
  title: z
    .string({ required_error: 'Work order title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(255),
  description: z.string().optional().default(''),
  customer_id: z.string().optional(),
  site: z.string().optional().default(''),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  assigned_to: z.string().nullable().optional(),
  cost_estimate: z.coerce.number().min(0).optional().default(0),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  scheduled_window: z.string().optional()
});

export const workOrderAssignSchema = z.object({
  assigned_to: z.string({ required_error: 'Please select a technician' }).min(1),
  scheduled_window: z.string().optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional()
});

export const workOrderScheduleSchema = z.object({
  scheduled_start: z
    .string({ required_error: 'Start time is required' })
    .min(1, 'Please select start date and time'),
  scheduled_end: z
    .string({ required_error: 'End time is required' })
    .min(1, 'Please select end date and time'),
  scheduled_window: z.string().optional()
});

export const workOrderChecklistSchema = z.object({
  item_text: z
    .string({ required_error: 'Item text is required' })
    .min(2, 'Item description must be at least 2 characters')
});

export const workOrderNoteSchema = z.object({
  note: z
    .string({ required_error: 'Note content is required' })
    .min(2, 'Note must be at least 2 characters'),
  is_internal: z.boolean().optional().default(false)
});

export const workOrderPhotoSchema = z.object({
  type: z.enum(['before', 'after']),
  url: z.string({ required_error: 'Image URL is required' }).min(3, 'Enter a valid image URL'),
  caption: z.string().max(255).optional().default('')
});

export const workOrderCompleteSchema = z.object({
  completion_notes: z.string().min(3, 'Please describe work completed'),
  actual_cost: z.coerce.number().min(0).optional().default(0),
  labor_hours: z.coerce.number().min(0).optional().default(1)
});

export const workOrderConfirmSchema = z.object({
  customer_signature_url: z
    .string({ required_error: 'Customer signature is required' })
    .min(3, 'Signature is required'),
  rating: z.coerce.number().min(1).max(5).default(5),
  feedback: z.string().optional().default('')
});

export const workOrderCloseSchema = z.object({
  closing_notes: z.string().optional().default('')
});
