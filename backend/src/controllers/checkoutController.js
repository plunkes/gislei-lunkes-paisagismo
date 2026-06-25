'use strict';

const { sequelize, Order, OrderItem, User, SiteConfig } = require('../models');
const { buildItems } = require('./orderController');
const { isValidPhone } = require('./authUserController');
const { createCharge } = require('../services/infinitePay');
const ApiError = require('../utils/ApiError');

/**
 * Monta a URL `wa.me` com o resumo do pedido como mensagem de texto.
 *
 * @param {string} number - Número WhatsApp (somente dígitos, com DDI).
 * @param {object} order - Dados do pedido.
 * @param {Array<{productName: string, unitPrice: number, quantity: number}>} items
 * @returns {string}
 */
function buildWhatsappUrl(number, order, items) {
  const lines = items.map(
    (i) =>
      `• ${i.quantity}x ${i.productName} — R$ ${(i.unitPrice * i.quantity)
        .toFixed(2)
        .replace('.', ',')}`
  );
  const msg = [
    `*Novo pedido — ${order.customerName}*`,
    '',
    ...lines,
    '',
    `*Total: R$ ${Number(order.total).toFixed(2).replace('.', ',')}*`,
    order.customerPhone ? `Telefone: ${order.customerPhone}` : '',
    order.customerEmail ? `Email: ${order.customerEmail}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

/**
 * POST /api/checkout — fluxo de finalização dinâmico (somente usuários logados).
 *
 * Requer autenticação (checkout-1) e que o usuário tenha telefone/WhatsApp
 * válido (checkout-2). Os dados do cliente vêm do usuário logado (checkout-3),
 * não do corpo da requisição.
 *
 * Lê o modo de venda em `SiteConfig`:
 *  - `ecommerceActive=true`  → cria o pedido e gera cobrança PIX (Infinite Pay),
 *    devolvendo os dados do QR Code para a tela de conclusão (checkout-4).
 *  - `ecommerceActive=false` → cria o pedido e devolve a URL do WhatsApp.
 *
 * @type {import('express').RequestHandler}
 */
async function checkout(req, res) {
  // checkout-1: apenas usuários autenticados.
  if (req.auth?.type !== 'user') {
    throw new ApiError(401, 'Faça login para finalizar a compra.');
  }
  const user = await User.findByPk(req.auth.sub);
  if (!user) throw new ApiError(404, 'Usuário não encontrado.');

  // checkout-2: telefone (WhatsApp) válido é obrigatório.
  if (!isValidPhone(user.phone || '')) {
    throw new ApiError(
      400,
      'Cadastre um telefone (WhatsApp) válido em "Minha Conta" antes de finalizar a compra.'
    );
  }

  const { cart, notes } = req.body || {};
  const config = await SiteConfig.getInstance();
  const ecommerceActive = config.ecommerceActive;
  const method = ecommerceActive ? 'infinitepay' : 'whatsapp';

  // Precifica/valida os itens no servidor (nunca confia no cliente).
  const { items, total } = await buildItems(cart);

  // Cria o pedido + itens numa transação. Dados do cliente = usuário logado.
  const order = await sequelize.transaction(async (t) => {
    const created = await Order.create(
      {
        userId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        total,
        paymentMethod: method,
        status: 'pendente',
        notes: notes || null,
      },
      { transaction: t }
    );
    for (const item of items) {
      await OrderItem.create({ ...item, orderId: created.id }, { transaction: t });
    }
    return created;
  });

  // --- Ramo A: E-commerce ativo → Infinite Pay (PIX) ---------------------
  if (ecommerceActive) {
    const charge = await createCharge({
      orderId: order.id,
      items,
      total,
      customer: { name: user.name, email: user.email, phone: user.phone },
    });
    await order.update({ paymentRef: charge.paymentRef });
    return res.status(201).json({
      mode: 'infinitepay',
      orderId: order.id,
      total,
      pix: { code: charge.pixCode, qrImageUrl: charge.qrImageUrl },
      checkoutUrl: charge.checkoutUrl || null,
    });
  }

  // --- Ramo B: E-commerce desativado → WhatsApp --------------------------
  const number = config.whatsappNumber || process.env.WHATSAPP_NUMBER;
  if (!number) {
    throw new ApiError(503, 'Número de WhatsApp não configurado.');
  }
  const redirectUrl = buildWhatsappUrl(number, order, items);
  return res.status(201).json({ mode: 'whatsapp', orderId: order.id, redirectUrl });
}

module.exports = { checkout, buildWhatsappUrl };
