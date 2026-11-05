import { z } from 'zod';

export const WORK_ORDER_STATUSES = [
  'draft',
  'scheduled',
  'dispatched',
  'in_progress',
  'review',
  'completed',
  'closed',
  'cancelled'
];

export const WORK_ORDER_PRIORITIES = ['low', 'normal', 'high', 'critical'];

export const createWorkOrderSchema = z.object({
  title: z
    .string({ required_error: 'Work order title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  description: z.string().optional().default(''),
  customer_id: z.string().optional(),
  service_request_id: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  asset_id: z.string().nullable().optional(),
  site: z.string().max(255).optional().default(''),
  priority: z.enum(WORK_ORDER_PRIORITIES).optional().default('normal'),
  cost_estimate: z.coerce.number().min(0).optional().default(0),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  scheduled_window: z.string().optional(),
  checklists: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          item_text: z.string().min(1),
          is_completed: z.boolean().optional().default(false)
        })
      ])
    )
    .optional()
    .default([])
});

export const updateWorkOrderSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  customer_id: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  asset_id: z.string().nullable().optional(),
  site: z.string().max(255).optional(),
  priority: z.enum(WORK_ORDER_PRIORITIES).optional(),
  cost_estimate: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  labor_hours: z.coerce.number().min(0).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  scheduled_start: z.string().nullable().optional(),
  scheduled_end: z.string().nullable().optional(),
  scheduled_window: z.string().nullable().optional()
});

export const assignTechnicianSchema = z.object({
  assigned_to: z.string({ required_error: 'Technician assignment ID is required' }).min(1),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  scheduled_window: z.string().optional()
});

export const scheduleWorkOrderSchema = z.object({
  scheduled_start: z.string({ required_error: 'Scheduled start timestamp is required' }),
  scheduled_end: z.string({ required_error: 'Scheduled end timestamp is required' }),
  scheduled_window: z.string().optional()
});

export const workOrderStatusTransitionSchema = z.object({
  status: z.enum(WORK_ORDER_STATUSES, {
    required_error: 'Target work order status is required'
  }),
  reason: z.string().max(1000).optional().default('')
});

export const addChecklistItemSchema = z.object({
  item_text: z
    .string({ required_error: 'Checklist item text is required' })
    .min(2, 'Item text must be at least 2 characters')
    .max(255),
  is_completed: z.boolean().optional().default(false)
});

export const updateChecklistItemSchema = z.object({
  item_text: z.string().min(2).max(255).optional(),
  is_completed: z.boolean().optional()
});

export const addJobNoteSchema = z.object({
  note: z
    .string({ required_error: 'Note content is required' })
    .min(2, 'Note must be at least 2 characters')
    .max(3000),
  is_internal: z.boolean().optional().default(false)
});

export const addPhotoSchema = z.object({
  type: z.enum(['before', 'after'], {
    required_error: "Photo type must be either 'before' or 'after'"
  }),
  url: z.string({ required_error: 'Photo URL is required' }).min(3),
  caption: z.string().max(255).optional().default('')
});

export const completeWorkOrderSchema = z.object({
  completion_notes: z.string().max(3000).optional().default(''),
  actual_cost: z.coerce.number().min(0).optional(),
  labor_hours: z.coerce.number().min(0).optional(),
  parts_used: z
    .array(
      z.object({
        item_id: z.string().optional(),
        name: z.string().min(1),
        quantity: z.coerce.number().min(1).default(1),
        cost: z.coerce.number().min(0).default(0)
      })
    )
    .optional()
    .default([])
});

export const confirmWorkOrderSchema = z.object({
  customer_signature_url: z
    .string({ required_error: 'Customer signature is required for signoff' })
    .min(3, 'Invalid signature'),
  rating: z.coerce.number().min(1).max(5).optional(),
  feedback: z.string().max(2000).optional().default('')
});

export const closeWorkOrderSchema = z.object({
  closing_notes: z.string().max(2000).optional().default('')
});

export default {
  create: createWorkOrderSchema,
  update: updateWorkOrderSchema,
  assign: assignTechnicianSchema,
  schedule: scheduleWorkOrderSchema,
  status: workOrderStatusTransitionSchema,
  addChecklist: addChecklistItemSchema,
  updateChecklist: updateChecklistItemSchema,
  addNote: addJobNoteSchema,
  addPhoto: addPhotoSchema,
  complete: completeWorkOrderSchema,
  confirm: confirmWorkOrderSchema,
  close: closeWorkOrderSchema
};
