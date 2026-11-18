const env = require('../config/env');
const { createTokenService } = require('./tokenFactory');

/** Tokens for platform admins: own secrets, audience and cookie, scoped to /admin/auth. */
module.exports = createTokenService({
  secrets: env.adminJwt,
  audience: 'umrahconnect-admin',
  cookieName: 'uc_admin_refresh',
  cookiePath: '/api/v1/admin/auth',
});
