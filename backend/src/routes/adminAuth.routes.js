const express = require('express');
const Joi = require('joi');
const controller = require('../controllers/adminAuth.controller');
const validate = require('../middlewares/validate');
const { authenticateAdmin } = require('../middlewares/adminAuth');
const { authLimiter, adminLoginLimiter } = require('../middlewares/rateLimiter');
const { email } = require('../validators/common');

const router = express.Router();

const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().max(72).required(),
});

router.use(authLimiter);

router.post('/login', adminLoginLimiter, validate(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticateAdmin, controller.me);

module.exports = router;
