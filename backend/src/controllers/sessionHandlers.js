const { sendSuccess } = require('../utils/apiResponse');

/**
 * Cookie-based session plumbing shared by user auth and admin auth. `tokens` decides which
 * cookie is used; `service` provides refresh(refreshToken) and logout(refreshToken).
 */
function createSessionHandlers(service, tokens) {
  /** Moves the refresh token into the HTTP-only cookie and never returns it in the body. */
  function respondWithSession(res, { refreshToken, ...session }, message) {
    if (refreshToken) tokens.setRefreshCookie(res, refreshToken);
    return sendSuccess(res, { message, data: session });
  }

  async function refresh(req, res) {
    try {
      respondWithSession(res, await service.refresh(tokens.readRefreshCookie(req)), 'Session refreshed');
    } catch (err) {
      tokens.clearRefreshCookie(res);
      throw err;
    }
  }

  async function logout(req, res) {
    await service.logout(tokens.readRefreshCookie(req));
    tokens.clearRefreshCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  }

  return { respondWithSession, refresh, logout };
}

module.exports = { createSessionHandlers };
