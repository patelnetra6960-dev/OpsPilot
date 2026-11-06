import { z } from 'zod';

export const clockInSchema = z.object({
  workforce_member_id: z.string().min(1).optional(),
  shift_id: z.string().min(1).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

export const clockOutSchema = z.object({
  workforce_member_id: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  break_minutes: z.number().int().min(0).max(480).default(0),
  notes: z.string().max(1000).optional().nullable()
});

export const timesheetApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected', 'disputed']),
  notes: z.string().max(1000).optional().nullable()
});

export const attendanceQuerySchema = z.object({
  workforce_member_id: z.string().min(1).optional(),
  shift_id: z.string().min(1).optional(),
  status: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export default {
  clockInSchema,
  clockOutSchema,
  timesheetApprovalSchema,
  attendanceQuerySchema
};
