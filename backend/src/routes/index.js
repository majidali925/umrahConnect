const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

router.get('/health', (_req, res) =>
  sendSuccess(res, {
    message: 'UmrahConnect API is running',
    data: { database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
  }),
);

router.use('/auth', require('./auth.routes'));
router.use('/agencies', require('./agency.routes'));
router.use('/packages', require('./package.routes'));
router.use('/quotations', require('./quotation.routes'));

module.exports = router;
