import { z } from 'zod';

export const createShiftSchema = z
  .object({
    workforce_member_id: z.string().min(1, { message: 'Valid workforce member identifier is required' }),
    start_time: z.string().datetime({ message: 'Valid start_time ISO timestamp is required' }),
    end_time: z.string().datetime({ message: 'Valid end_time ISO timestamp is required' }),
    department: z.string().max(100).optional().nullable(),
    location_name: z.string().max(255).optional().nullable(),
    location_lat: z.number().min(-90).max(90).optional().nullable(),
    location_lng: z.number().min(-180).max(180).optional().nullable(),
    notes: z.string().max(2000).optional().nullable()
  })
  .refine(
    (data) => new Date(data.end_time).getTime() > new Date(data.start_time).getTime(),
    {
      message: 'end_time must be chronologically after start_time',
      path: ['end_time']
    }
  );

export const updateShiftSchema = z
  .object({
    workforce_member_id: z.string().min(1).optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    department: z.string().max(100).optional().nullable(),
    location_name: z.string().max(255).optional().nullable(),
    location_lat: z.number().min(-90).max(90).optional().nullable(),
    location_lng: z.number().min(-180).max(180).optional().nullable(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    notes: z.string().max(2000).optional().nullable()
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time).getTime() > new Date(data.start_time).getTime();
      }
      return true;
    },
    {
      message: 'end_time must be chronologically after start_time',
      path: ['end_time']
    }
  );

export const shiftQuerySchema = z.object({
  workforce_member_id: z.string().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export default {
  createShiftSchema,
  updateShiftSchema,
  shiftQuerySchema
};
