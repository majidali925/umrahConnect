const ApiError = require('../utils/ApiError');
const { sha256, safeEqual } = require('../utils/crypto');

const REFRESH_GRACE_MS = 30 * 1000;
const SECRET_FIELDS = '+password +refreshTokenHash +previousRefreshTokenHash +refreshTokenRotatedAt';

/**
 * Refresh-token rotation for one account collection (users or admins). Only a hash of the
 * current refresh token is stored; the previous hash is accepted for a short grace window
 * so concurrent refreshes (e.g. two tabs) are not mistaken for token theft.
 *
 * @param {object} opts
 * @param {import('mongoose').Model} opts.Model  account model with the refresh-token fields
 * @param {object} opts.tokens                  instance from createTokenService
 * @param {(account) => Promise<void>} [opts.onReuse] called after a replayed token revokes the session
 */
function createSessionStore({ Model, tokens, onReuse = async () => {} }) {
  /** Issues a new access/refresh pair and stores only the refresh token's hash. */
  async function issue(account) {
    const accessToken = tokens.signAccessToken(account);
    const refreshToken = tokens.signRefreshToken(account);
    await Model.updateOne(
      { _id: account._id },
      {
        refreshTokenHash: sha256(refreshToken),
        previousRefreshTokenHash: account.refreshTokenHash || null,
        refreshTokenRotatedAt: new Date(),
      },
    );
    return { accessToken, refreshToken };
  }

  /**
   * Exchanges a refresh token for a new access token (and, normally, a new refresh token).
   * Returns { account, accessToken, refreshToken } where refreshToken is null inside the grace window.
   */
  async function rotate(refreshToken) {
    if (!refreshToken) throw ApiError.unauthorized('No active session', { code: 'NO_SESSION' });

    const payload = tokens.verifyRefreshToken(refreshToken);
    const account = await Model.findById(payload.sub).select(SECRET_FIELDS);
    if (!account || !account.isActive) {
      throw ApiError.unauthorized('Your session has expired. Please log in again.', { code: 'NO_SESSION' });
    }

    const tokenHash = sha256(refreshToken);

    if (account.refreshTokenHash && safeEqual(tokenHash, account.refreshTokenHash)) {
      // Atomic compare-and-set: only one concurrent request can rotate a given token.
      const next = tokens.signRefreshToken(account);
      const { modifiedCount } = await Model.updateOne(
        { _id: account._id, refreshTokenHash: tokenHash },
        { refreshTokenHash: sha256(next), previousRefreshTokenHash: tokenHash, refreshTokenRotatedAt: new Date() },
      );
      if (modifiedCount === 1) {
        return { account, accessToken: tokens.signAccessToken(account), refreshToken: next };
      }
      // Lost the race to a concurrent rotation: fall through to the grace-window check.
      account.previousRefreshTokenHash = tokenHash;
      account.refreshTokenRotatedAt = new Date();
    }

    // A concurrent request already rotated this token moments ago: issue an access token only.
    const withinGrace =
      account.previousRefreshTokenHash &&
      safeEqual(tokenHash, account.previousRefreshTokenHash) &&
      account.refreshTokenRotatedAt &&
      Date.now() - account.refreshTokenRotatedAt.getTime() < REFRESH_GRACE_MS;
    if (withinGrace) {
      return { account, accessToken: tokens.signAccessToken(account), refreshToken: null };
    }

    // A valid but already-rotated token was replayed: treat as theft and revoke the session.
    await Model.updateOne({ _id: account._id }, { refreshTokenHash: null, previousRefreshTokenHash: null });
    await onReuse(account);
    throw ApiError.unauthorized('Your session has expired. Please log in again.', { code: 'REFRESH_TOKEN_REUSED' });
  }

  /** Revokes the session that owns this refresh token, if it is still current. */
  async function revoke(refreshToken) {
    if (!refreshToken) return;
    try {
      const payload = tokens.verifyRefreshToken(refreshToken);
      await Model.updateOne(
        { _id: payload.sub, refreshTokenHash: sha256(refreshToken) },
        { refreshTokenHash: null, previousRefreshTokenHash: null },
      );
    } catch {
      // Invalid or expired token: nothing to revoke, the cookie is cleared regardless.
    }
  }

  return { issue, rotate, revoke, SECRET_FIELDS };
}

module.exports = { createSessionStore };
