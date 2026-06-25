'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @typedef {object} TokenPayload
 * @property {string} sub - Subject id (User.id or Employee.id).
 * @property {('user'|'employee')} type - Principal type.
 * @property {string} [role] - Employee role, when type === 'employee'.
 * @property {string} [name]
 */

/**
 * Sign a JWT for the given payload.
 * @param {TokenPayload} payload
 * @returns {string} Signed JWT.
 */
function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {TokenPayload} Decoded payload.
 * @throws {jwt.JsonWebTokenError} If invalid/expired.
 */
function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
