'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { sign } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

/** Email format check (mirrors the frontend regex). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normaliza telefone para somente dígitos.
 * @param {string} raw
 * @returns {string}
 */
function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/**
 * Valida telefone brasileiro (10 a 13 dígitos, cobrindo DDD e DDI opcional).
 * @param {string} digits - Apenas dígitos.
 * @returns {boolean}
 */
function isValidPhone(digits) {
  return /^\d{10,13}$/.test(digits);
}

/**
 * Serialize a User into a safe public object (never expose passwordHash).
 * @param {import('sequelize').Model} user
 * @returns {object}
 */
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    provider: user.provider,
    avatarUrl: user.avatarUrl || null,
  };
}

/**
 * Issue a signed JWT for a user.
 * @param {import('sequelize').Model} user
 * @returns {string}
 */
function tokenForUser(user) {
  return sign({ sub: user.id, type: 'user', name: user.name });
}

/**
 * POST /api/auth/register — cadastro local (email + senha).
 * @type {import('express').RequestHandler}
 */
async function register(req, res) {
  const { name, email, password, phone } = req.body || {};

  if (!name || !name.trim()) throw new ApiError(400, 'Nome é obrigatório.');
  if (!email || !EMAIL_RE.test(email)) throw new ApiError(400, 'Email inválido.');
  if (!password || password.length < 8) {
    throw new ApiError(400, 'Senha deve ter ao menos 8 caracteres.');
  }
  // Telefone (WhatsApp) obrigatório no cadastro para permitir compras.
  const phoneDigits = normalizePhone(phone);
  if (!isValidPhone(phoneDigits)) {
    throw new ApiError(400, 'Telefone (WhatsApp) válido é obrigatório.');
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) throw new ApiError(409, 'Email já cadastrado.');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    phone: phoneDigits,
    passwordHash,
    provider: 'local',
  });

  res.status(201).json({ token: tokenForUser(user), user: publicUser(user) });
}

/**
 * POST /api/auth/login — login local.
 * @type {import('express').RequestHandler}
 */
async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email e senha são obrigatórios.');

  const user = await User.findOne({ where: { email: String(email).toLowerCase() } });
  // Generic message to avoid user enumeration.
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Credenciais inválidas.');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Credenciais inválidas.');

  res.json({ token: tokenForUser(user), user: publicUser(user) });
}

/**
 * POST /api/auth/google — login/cadastro via Google.
 *
 * Recebe o `credential` (ID token JWT) do Google Identity Services no frontend,
 * verifica a assinatura contra o GOOGLE_CLIENT_ID e cria/recupera o usuário.
 *
 * @type {import('express').RequestHandler}
 */
async function googleLogin(req, res) {
  const { credential } = req.body || {};
  if (!credential) throw new ApiError(400, 'Credencial do Google ausente.');
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, 'GOOGLE_CLIENT_ID não configurado no servidor.');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Token do Google inválido.');
  }

  const { sub: googleId, email, name, picture } = payload;
  if (!email) throw new ApiError(400, 'Conta Google sem email.');

  // Match by googleId first, then by email (vincula conta local existente).
  let user = await User.findOne({ where: { googleId } });
  if (!user) {
    user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (user) {
      user.googleId = googleId;
      user.provider = 'google';
      if (picture && !user.avatarUrl) user.avatarUrl = picture;
      await user.save();
    } else {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        provider: 'google',
        avatarUrl: picture || null,
      });
    }
  }

  res.json({ token: tokenForUser(user), user: publicUser(user) });
}

/**
 * GET /api/auth/me — dados do usuário autenticado.
 * @type {import('express').RequestHandler}
 */
async function me(req, res) {
  if (req.auth?.type !== 'user') throw new ApiError(403, 'Token não é de usuário.');
  const user = await User.findByPk(req.auth.sub);
  if (!user) throw new ApiError(404, 'Usuário não encontrado.');
  res.json({ user: publicUser(user) });
}

/**
 * POST /api/auth/forgot-password — inicia recuperação de senha.
 *
 * Responde sempre de forma genérica (evita enumeração de e-mails). Quando o
 * e-mail existe e é de conta local, gera um token de redefinição (JWT de 15min).
 *
 * Sem serviço de e-mail configurado: em ambiente de desenvolvimento o token é
 * retornado no corpo (`resetToken`) para permitir o fluxo. Em produção, ele
 * deveria ser enviado por e-mail e NÃO retornado.
 *
 * @type {import('express').RequestHandler}
 */
async function forgotPassword(req, res) {
  const { email } = req.body || {};
  const generic = {
    message: 'Se houver uma conta com este e-mail, enviaremos instruções de redefinição.',
  };
  if (!email || !EMAIL_RE.test(email)) return res.json(generic);

  const user = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (!user || !user.passwordHash) return res.json(generic);

  const resetToken = jwt.sign({ sub: user.id, purpose: 'pwreset' }, JWT_SECRET, {
    expiresIn: '15m',
  });

  const payload = { ...generic };
  // Conveniência de desenvolvimento — remova em produção (enviar por e-mail).
  if (process.env.NODE_ENV !== 'production') {
    payload.resetToken = resetToken;
  }
  res.json(payload);
}

/**
 * POST /api/auth/reset-password — define nova senha via token de redefinição.
 * @type {import('express').RequestHandler}
 */
async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (!token) throw new ApiError(400, 'Token ausente.');
  if (!password || password.length < 8) {
    throw new ApiError(400, 'Senha deve ter ao menos 8 caracteres.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new ApiError(400, 'Token inválido ou expirado.');
  }
  if (decoded.purpose !== 'pwreset') throw new ApiError(400, 'Token inválido.');

  const user = await User.findByPk(decoded.sub);
  if (!user) throw new ApiError(404, 'Usuário não encontrado.');

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ message: 'Senha redefinida com sucesso.' });
}

module.exports = {
  register,
  login,
  googleLogin,
  me,
  forgotPassword,
  resetPassword,
  publicUser,
  normalizePhone,
  isValidPhone,
};
