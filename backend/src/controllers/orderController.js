'use strict';

const { sequelize, Order, OrderItem, Product, SiteConfig } = require('../models');
const ApiError = require('../utils/ApiError');

const ORDER_STATUSES = [
  'pendente', 'pago', 'em_separacao', 'enviado', 'concluido', 'cancelado',
];

/** Valida formato de UUID v4 (PK dos produtos). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UF brasileira: duas letras. */
const UF_RE = /^[A-Za-z]{2}$/;

/**
 * Valida e normaliza o endereço de entrega enviado no checkout. Lança 400 se
 * algum campo obrigatório faltar. Retorna um objeto já com os nomes das colunas
 * do model `Order`, pronto para espalhar em `Order.create`.
 *
 * @param {object} shipping - { cep, street, number, complement?, district, city, state }
 * @returns {{ shippingCep: string, shippingStreet: string, shippingNumber: string,
 *   shippingComplement: string|null, shippingDistrict: string, shippingCity: string,
 *   shippingState: string }}
 */
function validateShipping(shipping) {
  const s = shipping || {};
  const cep = String(s.cep || '').replace(/\D/g, '');
  const street = String(s.street || '').trim();
  const number = String(s.number || '').trim();
  const complement = String(s.complement || '').trim();
  const district = String(s.district || '').trim();
  const city = String(s.city || '').trim();
  const state = String(s.state || '').trim().toUpperCase();

  if (cep.length !== 8) {
    throw new ApiError(400, 'Informe um CEP válido (8 dígitos).');
  }
  if (!street || !number || !district || !city) {
    throw new ApiError(400, 'Preencha o endereço de entrega completo (rua, número, bairro e cidade).');
  }
  if (!UF_RE.test(state)) {
    throw new ApiError(400, 'Informe a UF (2 letras).');
  }

  return {
    shippingCep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    shippingStreet: street.slice(0, 160),
    shippingNumber: number.slice(0, 20),
    shippingComplement: complement.slice(0, 80) || null,
    shippingDistrict: district.slice(0, 80),
    shippingCity: city.slice(0, 80),
    shippingState: state.slice(0, 2),
  };
}

/**
 * Build validated order line items from a cart payload, pricing each line from
 * the DB (never trusting client prices) and computing the total.
 *
 * Ids inválidos (ex.: ids do catálogo de fallback, que não são UUID) são
 * tratados como "produto indisponível" (400) — evitando que um erro de tipo do
 * Postgres (`invalid input syntax for type uuid`) vire um 500.
 *
 * @param {Array<{id: string, qnt?: number, quantity?: number}>} cart
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function buildItems(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new ApiError(400, 'Carrinho vazio.');
  }
  const items = [];
  let total = 0;
  for (const line of cart) {
    const qty = Number(line.qnt ?? line.quantity ?? 1);
    const id = line.id != null ? String(line.id) : '';
    if (!id || qty < 1) throw new ApiError(400, 'Item de carrinho inválido.');
    if (!UUID_RE.test(id)) {
      throw new ApiError(400, 'Há itens inválidos no carrinho. Recarregue a loja e tente novamente.');
    }
    const product = await Product.findByPk(id);
    if (!product || !product.active) {
      throw new ApiError(400, `Produto indisponível: ${product ? product.name : id}`);
    }
    const unitPrice = Number(product.price);
    total += unitPrice * qty;
    items.push({
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: qty,
    });
  }
  return { items, total: Number(total.toFixed(2)) };
}

/**
 * POST /api/orders — cria um pedido a partir do carrinho.
 *
 * Usado pelo fluxo de checkout (Infinite Pay) e pelo modo WhatsApp para
 * registrar o pedido. `paymentMethod` deve refletir o modo ativo da loja.
 * Reduz o estoque dos produtos dentro da mesma transação.
 *
 * @type {import('express').RequestHandler}
 */
async function create(req, res) {
  const { customerName, customerEmail, customerPhone, cart, paymentMethod, notes, shipping } =
    req.body || {};

  if (!customerName || !customerName.trim()) {
    throw new ApiError(400, 'Nome do cliente é obrigatório.');
  }
  const method = paymentMethod || 'whatsapp';
  if (!['infinitepay', 'whatsapp'].includes(method)) {
    throw new ApiError(400, 'Método de pagamento inválido.');
  }

  const ship = validateShipping(shipping);
  const { items, total } = await buildItems(cart);

  const order = await sequelize.transaction(async (t) => {
    const created = await Order.create(
      {
        userId: req.auth?.type === 'user' ? req.auth.sub : null,
        customerName: customerName.trim(),
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        total,
        paymentMethod: method,
        status: 'pendente',
        notes: notes || null,
        ...ship,
      },
      { transaction: t }
    );

    for (const item of items) {
      await OrderItem.create({ ...item, orderId: created.id }, { transaction: t });
      // Decrementa estoque quando aplicável (ignora se ficaria negativo).
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (product && product.quantity >= item.quantity) {
        await product.decrement('quantity', { by: item.quantity, transaction: t });
      }
    }
    return created;
  });

  const full = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
  res.status(201).json({ order: full });
}

/**
 * GET /api/backoffice/orders — lista pedidos. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function list(req, res) {
  const where = {};
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
    where.status = req.query.status;
  }
  const orders = await Order.findAll({
    where,
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ orders });
}

/**
 * GET /api/backoffice/orders/:id — detalhe do pedido. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function getOne(req, res) {
  const order = await Order.findByPk(req.params.id, {
    include: [{ model: OrderItem, as: 'items' }],
  });
  if (!order) throw new ApiError(404, 'Pedido não encontrado.');
  res.json({ order });
}

/**
 * PATCH /api/backoffice/orders/:id/status — atualiza status. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function updateStatus(req, res) {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) throw new ApiError(400, 'Status inválido.');
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new ApiError(404, 'Pedido não encontrado.');
  await order.update({ status });
  res.json({ order });
}

module.exports = { create, list, getOne, updateStatus, buildItems, validateShipping };
