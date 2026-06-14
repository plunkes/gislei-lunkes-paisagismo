'use strict';

/**
 * Operational error carrying an HTTP status code.
 *
 * Throw inside controllers/services to short-circuit to the error handler with
 * a clean client-facing message (e.g. `throw new ApiError(404, 'Não encontrado')`).
 */
class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code.
   * @param {string} message - Client-facing message.
   * @param {object} [details] - Optional extra payload (e.g. validation errors).
   */
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
