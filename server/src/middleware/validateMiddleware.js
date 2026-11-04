import { sendError } from '../utils/responseHandler.js';

/**
 * Reusable Request Validation Middleware using Zod Schemas
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body'|'query'|'params'} source - Request property to validate (default: 'body')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errorDetails = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code
        }));

        const isWeakPassword = result.error.errors.some(
          (err) => err.path.includes('password') && err.message?.toLowerCase().includes('at least')
        );
        const errorCode = isWeakPassword ? 'WEAK_PASSWORD' : 'VALIDATION_ERROR';

        return sendError(
          res,
          'Validation failed: Please inspect error details',
          400,
          errorCode,
          errorDetails
        );
      }

      // Assign sanitized and parsed data back to request
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default validate;
