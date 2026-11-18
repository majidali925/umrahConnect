const ApiError = require('../utils/ApiError');

/**
 * Builds middleware that verifies a Bearer access token with `tokens` and loads the account
 * from `Model` into req[reqKey]. Role and account status always come from the database,
 * never from the token alone. Tokens signed for another account type fail verification.
 */
function bearerAuth({ Model, tokens, reqKey }) {
  return async function authenticateBearer(req, _res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

    const payload = tokens.verifyAccessToken(token);
    const account = await Model.findById(payload.sub);
    if (!account || !account.isActive) {
      throw ApiError.unauthorized('Account is not available', { code: 'ACCOUNT_UNAVAILABLE' });
    }

    req[reqKey] = account;
    next();
  };
}

module.exports = { bearerAuth };
