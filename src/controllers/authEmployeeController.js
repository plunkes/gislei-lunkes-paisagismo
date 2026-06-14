'use strict';

const bcrypt = require('bcryptjs');
const { Employee } = require('../models');
const { sign } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Serialize an Employee into a safe object (never expose passwordHash).
 * @param {import('sequelize').Model} emp
 * @returns {object}
 */
function publicEmployee(emp) {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    active: emp.active,
  };
}

/**
 * POST /api/backoffice/auth/login — login de funcionário.
 * @type {import('express').RequestHandler}
 */
async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email e senha são obrigatórios.');

  const emp = await Employee.findOne({ where: { email: String(email).toLowerCase() } });
  if (!emp || !emp.active) throw new ApiError(401, 'Credenciais inválidas.');

  const ok = await bcrypt.compare(password, emp.passwordHash);
  if (!ok) throw new ApiError(401, 'Credenciais inválidas.');

  const token = sign({ sub: emp.id, type: 'employee', role: emp.role, name: emp.name });
  res.json({ token, employee: publicEmployee(emp) });
}

/**
 * GET /api/backoffice/auth/me — funcionário autenticado.
 * @type {import('express').RequestHandler}
 */
async function me(req, res) {
  const emp = await Employee.findByPk(req.auth.sub);
  if (!emp) throw new ApiError(404, 'Funcionário não encontrado.');
  res.json({ employee: publicEmployee(emp) });
}

/**
 * POST /api/backoffice/employees — cria funcionário (somente admin).
 * @type {import('express').RequestHandler}
 */
async function create(req, res) {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    throw new ApiError(400, 'Nome, email e senha são obrigatórios.');
  }
  if (password.length < 8) throw new ApiError(400, 'Senha deve ter ao menos 8 caracteres.');
  if (role && !['admin', 'funcionario'].includes(role)) {
    throw new ApiError(400, 'Cargo inválido.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const emp = await Employee.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    role: role || 'funcionario',
  });
  res.status(201).json({ employee: publicEmployee(emp) });
}

module.exports = { login, me, create };
