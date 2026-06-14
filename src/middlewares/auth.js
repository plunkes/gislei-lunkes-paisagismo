'use strict';

const { verify } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Extract the Bearer token from the Authorization header.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Require a valid JWT of any principal type. Attaches the decoded payload to
 * `req.auth`. Responds 401 if missing/invalid.
 *
 * @type {import('express').RequestHandler}
 */
function authRequired(req, _res, next) {
  const token = getBearer(req);
  if (!token) return next(new ApiError(401, 'Token de autenticação ausente.'));
  try {
    req.auth = verify(token);
    return next();
  } catch {
    return next(new ApiError(401, 'Token inválido ou expirado.'));
  }
}

/**
 * Require an authenticated *employee* (backoffice). Use after — or instead of —
 * {@link authRequired}; it validates the token itself.
 *
 * @type {import('express').RequestHandler}
 */
function employeeRequired(req, _res, next) {
  const token = getBearer(req);
  if (!token) return next(new ApiError(401, 'Token de autenticação ausente.'));
  try {
    const payload = verify(token);
    if (payload.type !== 'employee') {
      return next(new ApiError(403, 'Acesso restrito a funcionários.'));
    }
    req.auth = payload;
    return next();
  } catch {
    return next(new ApiError(401, 'Token inválido ou expirado.'));
  }
}

/**
 * Require the employee to have one of the given roles. Must run after
 * {@link employeeRequired}.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin').
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth || req.auth.type !== 'employee') {
      return next(new ApiError(403, 'Acesso restrito a funcionários.'));
    }
    if (!roles.includes(req.auth.role)) {
      return next(new ApiError(403, 'Permissão insuficiente.'));
    }
    return next();
  };
}

module.exports = { authRequired, employeeRequired, requireRole };
