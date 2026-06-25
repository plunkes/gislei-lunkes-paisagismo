'use strict';

const { Product } = require('../models');
const ApiError = require('../utils/ApiError');

const CATEGORIES = ['kokedama', 'arranjo', 'vaso', 'servico', 'acessorio'];

/**
 * GET /api/products — lista pública (somente produtos ativos).
 * Suporta `?category=` e `?maxPrice=` para filtragem server-side opcional.
 * @type {import('express').RequestHandler}
 */
async function listPublic(req, res) {
  const where = { active: true };
  if (req.query.category && CATEGORIES.includes(req.query.category)) {
    where.category = req.query.category;
  }
  const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json({ products });
}

/**
 * GET /api/products/:id — detalhe público de um produto ativo.
 * @type {import('express').RequestHandler}
 */
async function getOne(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product || !product.active) throw new ApiError(404, 'Produto não encontrado.');
  res.json({ product });
}

/**
 * GET /api/backoffice/products — lista completa (inclui inativos). Funcionário.
 * @type {import('express').RequestHandler}
 */
async function listAll(_req, res) {
  const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ products });
}

/** Pick only the editable product fields from a request body. */
function pickFields(body = {}) {
  const fields = {};
  for (const k of [
    'name', 'description', 'category', 'badge', 'price',
    'oldPrice', 'imageUrl', 'quantity', 'stockStatus', 'active',
  ]) {
    if (body[k] !== undefined) fields[k] = body[k];
  }
  return fields;
}

/**
 * POST /api/backoffice/products — cria produto. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function create(req, res) {
  const data = pickFields(req.body);
  if (!data.name) throw new ApiError(400, 'Nome é obrigatório.');
  if (data.price === undefined) throw new ApiError(400, 'Preço é obrigatório.');
  const product = await Product.create(data);
  res.status(201).json({ product });
}

/**
 * PUT /api/backoffice/products/:id — atualiza produto/estoque. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function update(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Produto não encontrado.');
  await product.update(pickFields(req.body));
  res.json({ product });
}

/**
 * DELETE /api/backoffice/products/:id — remove produto. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function remove(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Produto não encontrado.');
  await product.destroy();
  res.status(204).end();
}

module.exports = { listPublic, getOne, listAll, create, update, remove };
