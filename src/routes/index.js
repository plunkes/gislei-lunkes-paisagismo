'use strict';

const { Router } = require('express');
const authUserRoutes = require('./authUser.routes');
const accountRoutes = require('./account.routes');
const publicRoutes = require('./public.routes');
const backofficeRoutes = require('./backoffice.routes');

const router = Router();

/**
 * Aggregates all API sub-routers under `/api`:
 *   /api/auth/*         — autenticação de usuários (local + Google)
 *   /api/products, /api/orders, /api/config/public — rotas públicas
 *   /api/backoffice/*   — área de funcionários (protegida)
 */
router.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

router.use('/auth', authUserRoutes);
router.use('/account', accountRoutes);
router.use('/', publicRoutes);
router.use('/backoffice', backofficeRoutes);

module.exports = router;
