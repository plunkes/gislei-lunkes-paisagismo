'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/accountController');
const asyncHandler = require('../utils/asyncHandler');
const { authRequired } = require('../middlewares/auth');

const router = Router();

// Todas as rotas exigem usuário autenticado.
router.use(authRequired);

router.get('/', asyncHandler(ctrl.getProfile));
router.put('/', asyncHandler(ctrl.updateProfile));
router.delete('/', asyncHandler(ctrl.deleteAccount));
router.get('/orders', asyncHandler(ctrl.orderHistory));

module.exports = router;
