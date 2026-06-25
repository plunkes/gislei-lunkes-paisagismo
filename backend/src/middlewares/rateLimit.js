'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Stricter limiter for authentication endpoints to slow brute-force attempts.
 * 10 requests / 15 min per IP.
 * @type {import('express').RequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

/**
 * General API limiter. 300 requests / 15 min per IP.
 * @type {import('express').RequestHandler}
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
