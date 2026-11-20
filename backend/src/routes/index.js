const express = require('express');
const { sendSuccess } = require('../utils/apiResponse');
const { connectDatabase, describeConnectionError } = require('../config/database');

const router = express.Router();

// Connects if needed, so it reports the real state (and why it failed) rather than
// "disconnected" just because nothing has connected yet. 503 lets uptime monitors alert.
router.get('/health', async (_req, res) => {
  try {
    await connectDatabase();
    return sendSuccess(res, { message: 'API is running', data: { database: 'connected' } });
  } catch (err) {
    console.error('[db] Health check could not connect:', err.message);
    return res.status(503).json({
      success: false,
      message: 'API is running but the database is unavailable',
      data: { database: 'disconnected', reason: describeConnectionError(err) },
    });
  }
});

router.use('/auth', require('./auth.routes'));
router.use('/agencies', require('./agency.routes'));
router.use('/packages', require('./package.routes'));
router.use('/quotations', require('./quotation.routes'));

module.exports = router;
