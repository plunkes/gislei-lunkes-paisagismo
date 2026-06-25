'use strict';

const { Router } = require('express');
const empAuthCtrl = require('../controllers/authEmployeeController');
const productCtrl = require('../controllers/productController');
const orderCtrl = require('../controllers/orderController');
const configCtrl = require('../controllers/configController');
const analyticsCtrl = require('../controllers/analyticsController');
const uploadCtrl = require('../controllers/uploadController');
const asyncHandler = require('../utils/asyncHandler');
const { employeeRequired, requireRole } = require('../middlewares/auth');
const { uploadSingleImage } = require('../middlewares/upload');
const { authLimiter } = require('../middlewares/rateLimit');

const router = Router();

// --- Auth de funcionário ---
router.post('/auth/login', authLimiter, asyncHandler(empAuthCtrl.login));
router.get('/auth/me', employeeRequired, asyncHandler(empAuthCtrl.me));

// --- Gestão de funcionários (somente admin) ---
router.post(
  '/employees',
  employeeRequired,
  requireRole('admin'),
  asyncHandler(empAuthCtrl.create)
);

// --- Produtos / estoque (qualquer funcionário) ---
router.get('/products', employeeRequired, asyncHandler(productCtrl.listAll));
router.post('/products', employeeRequired, asyncHandler(productCtrl.create));
router.put('/products/:id', employeeRequired, asyncHandler(productCtrl.update));
router.delete('/products/:id', employeeRequired, asyncHandler(productCtrl.remove));

// --- Upload de imagens (qualquer funcionário) ---
router.post(
  '/uploads',
  employeeRequired,
  uploadSingleImage,
  asyncHandler(uploadCtrl.uploadImage)
);

// --- Pedidos (qualquer funcionário) ---
router.get('/orders', employeeRequired, asyncHandler(orderCtrl.list));
router.get('/orders/:id', employeeRequired, asyncHandler(orderCtrl.getOne));
router.patch('/orders/:id/status', employeeRequired, asyncHandler(orderCtrl.updateStatus));

// --- Configuração do site ---
router.get('/config', employeeRequired, asyncHandler(configCtrl.getFull));
router.put('/config', employeeRequired, requireRole('admin'), asyncHandler(configCtrl.update));

// --- Estatísticas anônimas (uso interno) ---
router.get('/analytics', employeeRequired, asyncHandler(analyticsCtrl.summary));

module.exports = router;
