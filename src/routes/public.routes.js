'use strict';

const { Router } = require('express');
const productCtrl = require('../controllers/productController');
const orderCtrl = require('../controllers/orderController');
const configCtrl = require('../controllers/configController');
const checkoutCtrl = require('../controllers/checkoutController');
const analyticsCtrl = require('../controllers/analyticsController');
const asyncHandler = require('../utils/asyncHandler');
const { authRequired } = require('../middlewares/auth');

const router = Router();

// Catálogo público
router.get('/products', asyncHandler(productCtrl.listPublic));
router.get('/products/:id', asyncHandler(productCtrl.getOne));

// Status da loja (modo Infinite Pay vs WhatsApp)
router.get('/config/public', asyncHandler(configCtrl.getPublic));

// Criação de pedido (checkout). Sem auth obrigatória: aceita convidado.
router.post('/orders', asyncHandler(orderCtrl.create));

// Checkout dinâmico (Infinite Pay vs WhatsApp). Requer usuário autenticado.
router.post('/checkout', authRequired, asyncHandler(checkoutCtrl.checkout));

// Tracking anônimo de eventos (LGPD: sem dados pessoais).
router.post('/track', asyncHandler(analyticsCtrl.track));

module.exports = router;
