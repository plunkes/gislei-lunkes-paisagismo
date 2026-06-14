'use strict';

/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * `next()` (and thus to the central error handler) instead of crashing the
 * process with an unhandled rejection.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} fn
 * @returns {import('express').RequestHandler}
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
