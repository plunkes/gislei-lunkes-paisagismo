'use strict';

const { fn, col } = require('sequelize');
const { Analytics } = require('../models');
const ApiError = require('../utils/ApiError');

/** Tipos de evento aceitos no endpoint público de tracking (whitelist). */
const ALLOWED_EVENTS = ['pageview', 'product_click', 'add_to_cart', 'checkout_start'];

/**
 * POST /api/track — registra um evento de uso anônimo enviado pelo frontend.
 *
 * Anônimo por construção: aceita somente `eventType` (whitelist), `path` e um
 * `refId` não-pessoal (ex.: id de produto). Ignora qualquer outro campo. Nunca
 * falha a resposta por erro de banco.
 *
 * @type {import('express').RequestHandler}
 */
async function track(req, res) {
  const { eventType, path, refId } = req.body || {};
  if (!ALLOWED_EVENTS.includes(eventType)) {
    throw new ApiError(400, 'Tipo de evento não permitido.');
  }
  // refId limitado e sem PII (truncado por segurança).
  const safeRef = refId != null ? String(refId).slice(0, 120) : null;
  const safePath = path != null ? String(path).slice(0, 255) : null;

  Analytics.track({ eventType, path: safePath, refId: safeRef }).catch(() => {});
  res.status(202).json({ ok: true });
}

/**
 * GET /api/backoffice/analytics — resumo agregado para uso interno. Funcionário.
 *
 * Retorna totais por tipo de evento e por caminho. Todos os dados já são
 * anônimos e agregados na origem.
 *
 * @type {import('express').RequestHandler}
 */
async function summary(_req, res) {
  const byType = await Analytics.findAll({
    attributes: ['eventType', [fn('SUM', col('count')), 'total']],
    group: ['eventType'],
    raw: true,
  });
  const byPath = await Analytics.findAll({
    attributes: ['path', [fn('SUM', col('count')), 'total']],
    where: { eventType: 'pageview' },
    group: ['path'],
    order: [[fn('SUM', col('count')), 'DESC']],
    limit: 20,
    raw: true,
  });
  const topProducts = await Analytics.findAll({
    attributes: ['refId', [fn('SUM', col('count')), 'total']],
    where: { eventType: 'product_click' },
    group: ['refId'],
    order: [[fn('SUM', col('count')), 'DESC']],
    limit: 20,
    raw: true,
  });
  // Produtos mais adicionados ao carrinho (o frontend emite add_to_cart com o
  // id do produto em refId).
  const topCart = await Analytics.findAll({
    attributes: ['refId', [fn('SUM', col('count')), 'total']],
    where: { eventType: 'add_to_cart' },
    group: ['refId'],
    order: [[fn('SUM', col('count')), 'DESC']],
    limit: 20,
    raw: true,
  });

  res.json({ byType, byPath, topProducts, topCart });
}

module.exports = { track, summary };
