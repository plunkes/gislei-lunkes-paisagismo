'use strict';

const ApiError = require('../utils/ApiError');

/**
 * 404 handler for unmatched routes.
 * @type {import('express').RequestHandler}
 */
function notFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.', path: req.originalUrl });
}

/**
 * Central error handler. Converts known errors (ApiError, Sequelize validation/
 * unique constraint) into clean JSON; hides internals for unexpected errors.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Sequelize validation / unique constraint -> 400 / 409
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Registro duplicado.',
      details: err.errors?.map((e) => e.message),
    });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: err.errors?.map((e) => e.message),
    });
  }

  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }

  // Erros de tipo/constraint do banco (ex.: UUID malformado) -> 400, não 500.
  if (err.name === 'SequelizeDatabaseError') {
    console.warn('[errorHandler] Erro de banco:', err.message);
    return res.status(400).json({ error: 'Dados inválidos na requisição.' });
  }
  // Banco indisponível -> 503.
  if (err.name === 'SequelizeConnectionRefusedError' || err.name === 'SequelizeConnectionError') {
    return res.status(503).json({ error: 'Serviço de banco de dados indisponível.' });
  }

  console.error('[errorHandler] Erro inesperado:', err);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = { notFound, errorHandler };
