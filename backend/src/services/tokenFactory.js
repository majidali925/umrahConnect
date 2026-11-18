const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ISSUER = 'umrahconnect';

/**
 * Builds an access/refresh token toolkit for one kind of account. Users and admins each
 * get their own instance with separate secrets, audience, cookie name and cookie path,
 * so a token issued to one can never be accepted by the other.
 */
function createTokenService({ secrets, audience, cookieName, cookiePath }) {
  function signAccessToken(account) {
    return jwt.sign({ sub: account._id.toString(), role: account.role }, secrets.accessSecret, {
      expiresIn: secrets.accessExpiresIn,
      issuer: ISSUER,
      audience,
    });
  }

  function signRefreshToken(account) {
    // jti makes every refresh token unique, so rotation always yields a new hash.
    return jwt.sign({ sub: account._id.toString(), jti: crypto.randomUUID() }, secrets.refreshSecret, {
      expiresIn: secrets.refreshExpiresIn,
      issuer: ISSUER,
      audience,
    });
  }

  function verifyAccessToken(token) {
    try {
      return jwt.verify(token, secrets.accessSecret, { issuer: ISSUER, audience });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token expired', { code: 'TOKEN_EXPIRED' });
      }
      throw ApiError.unauthorized('Invalid access token', { code: 'INVALID_TOKEN' });
    }
  }

  function verifyRefreshToken(token) {
    try {
      return jwt.verify(token, secrets.refreshSecret, { issuer: ISSUER, audience });
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'REFRESH_TOKEN_EXPIRED' : 'INVALID_REFRESH_TOKEN';
      throw ApiError.unauthorized('Your session has expired. Please log in again.', { code });
    }
  }

  const baseCookieOptions = () => ({
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: cookiePath,
  });

  function setRefreshCookie(res, refreshToken) {
    const { exp } = jwt.decode(refreshToken);
    res.cookie(cookieName, refreshToken, { ...baseCookieOptions(), maxAge: exp * 1000 - Date.now() });
  }

  function clearRefreshCookie(res) {
    res.clearCookie(cookieName, baseCookieOptions());
  }

  const readRefreshCookie = (req) => req.cookies?.[cookieName];

  return {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    setRefreshCookie,
    clearRefreshCookie,
    readRefreshCookie,
  };
}

module.exports = { createTokenService };
