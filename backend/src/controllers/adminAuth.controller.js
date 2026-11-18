const adminAuthService = require('../services/adminAuth.service');
const adminTokens = require('../services/adminToken.service');
const { sendSuccess } = require('../utils/apiResponse');
const { createSessionHandlers } = require('./sessionHandlers');

const { respondWithSession, refresh, logout } = createSessionHandlers(adminAuthService, adminTokens);

async function login(req, res) {
  const session = await adminAuthService.login(req.body, { ip: req.ip });
  respondWithSession(res, session, 'Logged in successfully');
}

async function me(req, res) {
  sendSuccess(res, { data: adminAuthService.buildSession(req.admin) });
}

module.exports = { login, refresh, logout, me };
