'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/authUserController');
const asyncHandler = require('../utils/asyncHandler');
const { authRequired } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.post('/register', authLimiter, asyncHandler(ctrl.register));
router.post('/login', authLimiter, asyncHandler(ctrl.login));
router.post('/google', authLimiter, asyncHandler(ctrl.googleLogin));
router.post('/forgot-password', authLimiter, asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(ctrl.resetPassword));
router.get('/me', authRequired, asyncHandler(ctrl.me));

module.exports = router;
