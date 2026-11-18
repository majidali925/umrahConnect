const env = require('../config/env');
const { createTokenService } = require('./tokenFactory');

/** Tokens for marketplace users (customers and vendors). Admins use adminToken.service. */
module.exports = createTokenService({
  secrets: env.jwt,
  audience: 'umrahconnect-api',
  cookieName: 'uc_refresh',
  cookiePath: '/api/v1/auth',
});
