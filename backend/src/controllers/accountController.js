'use strict';

const bcrypt = require('bcryptjs');
const { User, Order, OrderItem } = require('../models');
const ApiError = require('../utils/ApiError');
const { publicUser, normalizePhone, isValidPhone } = require('./authUserController');

/**
 * Garante que o token é de usuário e retorna a instância. 403/404 caso contrário.
 * @param {import('express').Request} req
 * @returns {Promise<import('sequelize').Model>}
 */
async function currentUser(req) {
  if (req.auth?.type !== 'user') throw new ApiError(403, 'Acesso restrito a clientes.');
  const user = await User.findByPk(req.auth.sub);
  if (!user) throw new ApiError(404, 'Usuário não encontrado.');
  return user;
}

/**
 * GET /api/account — dados cadastrais do usuário logado.
 * @type {import('express').RequestHandler}
 */
async function getProfile(req, res) {
  const user = await currentUser(req);
  res.json({ user: publicUser(user) });
}

/**
 * PUT /api/account — atualiza nome, telefone e (opcionalmente) senha.
 * @type {import('express').RequestHandler}
 */
async function updateProfile(req, res) {
  const user = await currentUser(req);
  const { name, phone, password } = req.body || {};

  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, 'Nome não pode ser vazio.');
    user.name = name.trim();
  }
  if (phone !== undefined) {
    const digits = normalizePhone(phone);
    if (!isValidPhone(digits)) throw new ApiError(400, 'Telefone (WhatsApp) inválido.');
    user.phone = digits;
  }
  if (password) {
    if (password.length < 8) throw new ApiError(400, 'Senha deve ter ao menos 8 caracteres.');
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();
  res.json({ user: publicUser(user) });
}

/**
 * DELETE /api/account — exclui a conta do usuário logado.
 *
 * Mantém os pedidos históricos (anonimizados: `user_id` vira nulo) para
 * integridade dos registros de venda, mas remove os dados pessoais do usuário.
 *
 * @type {import('express').RequestHandler}
 */
async function deleteAccount(req, res) {
  const user = await currentUser(req);
  // Desvincula pedidos antes de remover o usuário (preserva histórico de vendas).
  await Order.update({ userId: null }, { where: { userId: user.id } });
  await user.destroy();
  res.status(204).end();
}

/**
 * GET /api/account/orders — histórico de pedidos do usuário logado.
 * @type {import('express').RequestHandler}
 */
async function orderHistory(req, res) {
  const user = await currentUser(req);
  const orders = await Order.findAll({
    where: { userId: user.id },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ orders });
}

module.exports = { getProfile, updateProfile, deleteAccount, orderHistory };
