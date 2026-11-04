import { z } from 'zod';

/**
 * Standard pagination and query options schema
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .default(1)
    .transform((val) => (val < 1 ? 1 : val)),
  limit: z.coerce
    .number()
    .int()
    .default(20)
    .transform((val) => (val > 100 ? 100 : val < 1 ? 20 : val)),
  sortBy: z.string().trim().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  from_date: z.string().trim().optional(),
  to_date: z.string().trim().optional()
});

/**
 * Standard route parameter schema for resource ID
 */
export const idParamSchema = z
  .object({
    id: z.string().min(1, 'Resource ID is required')
  })
  .passthrough();

/**
 * Standard business action payload schema
 */
export const actionPayloadSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Factory to create consistent business validator suites
 * @param {object} options
 * @param {z.ZodObject} options.createSchema - Schema for creating resource
 * @param {z.ZodObject} [options.updateSchema] - Schema for updating resource (defaults to createSchema.partial())
 * @param {z.ZodObject} [options.customQuerySchema] - Custom extra query filters
 */
export const createBusinessValidator = ({
  createSchema,
  updateSchema = null,
  customQuerySchema = null
}) => {
  const querySchema = customQuerySchema
    ? paginationQuerySchema.merge(customQuerySchema)
    : paginationQuerySchema;

  const resolvedUpdateSchema = updateSchema || createSchema.partial();

  return {
    query: querySchema,
    params: idParamSchema,
    create: createSchema,
    update: resolvedUpdateSchema,
    action: actionPayloadSchema
  };
};

export default {
  paginationQuerySchema,
  idParamSchema,
  actionPayloadSchema,
  createBusinessValidator
};
