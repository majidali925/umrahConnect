const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const { sendSuccess } = require('../utils/apiResponse');
const { createSessionHandlers } = require('./sessionHandlers');

const { respondWithSession, refresh, logout } = createSessionHandlers(authService, tokenService);

async function register(req, res) {
  const data = await authService.register(req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Account created. Enter the verification code we sent to continue.',
    data,
  });
}

async function login(req, res) {
  const session = await authService.login(req.body);
  respondWithSession(res, session, 'Logged in successfully');
}

async function verifyOtp(req, res) {
  const session = await authService.verifyAccountOtp(req.body);
  respondWithSession(res, session, 'Account verified successfully');
}

async function resendOtp(req, res) {
  const data = await authService.resendOtp(req.body);
  sendSuccess(res, { message: 'If the account exists, a new code has been sent.', data });
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body);
  sendSuccess(res, {
    message: 'If an account exists for these details, a password reset code has been sent to its email.',
  });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body);
  tokenService.clearRefreshCookie(res);
  sendSuccess(res, { message: 'Password reset successfully. Please log in with your new password.' });
}

async function me(req, res) {
  const session = await authService.buildSession(req.user);
  sendSuccess(res, { data: session });
}

module.exports = { register, login, verifyOtp, resendOtp, refresh, logout, forgotPassword, resetPassword, me };
