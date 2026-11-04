/**
 * Reusable Async Error Handling Middleware Wrapper
 * Wraps asynchronous Express route handlers to catch any rejected promises
 * and automatically forward the error to Express error middleware (next(err)).
 * Eliminates repetitive try-catch blocks across controllers.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
