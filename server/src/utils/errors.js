/**
 * Domain & HTTP Application Error Classes
 * Enforces uniform error status codes, error codes, and details across all business modules.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required. Missing or invalid credentials.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: You do not have permission to perform this action') {
    super(message, 403, 'INSUFFICIENT_ROLE_PERMISSIONS');
  }
}

export class TenantIsolationError extends AppError {
  constructor(message = 'Access denied: Resource does not belong to active organization') {
    super(message, 403, 'FORBIDDEN_CROSS_TENANT_ACCESS');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict: Resource with given identifier already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class BusinessRuleError extends AppError {
  constructor(message = 'Action violates business rules', details = null) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

export default {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  TenantIsolationError,
  ConflictError,
  BusinessRuleError
};
