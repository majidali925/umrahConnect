const express = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { authLimiter, sessionLimiter, sensitiveAuthLimiter } = require('../middlewares/rateLimiter');
const schemas = require('../validators/auth.validator');

const router = express.Router();

router.use(authLimiter);

router.post('/register', sensitiveAuthLimiter, validate(schemas.register), controller.register);
router.post('/login', sensitiveAuthLimiter, validate(schemas.login), controller.login);
router.post('/verify-otp', sensitiveAuthLimiter, validate(schemas.verifyOtp), controller.verifyOtp);
router.post('/resend-otp', sensitiveAuthLimiter, validate(schemas.resendOtp), controller.resendOtp);
router.post('/forgot-password', sensitiveAuthLimiter, validate(schemas.forgotPassword), controller.forgotPassword);
router.post('/reset-password', sensitiveAuthLimiter, validate(schemas.resetPassword), controller.resetPassword);
router.post('/refresh', sessionLimiter, controller.refresh);
router.post('/logout', sessionLimiter, controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
