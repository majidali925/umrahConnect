const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const tokenService = require('../services/token.service');
const { bearerAuth } = require('./bearerAuth');

/** Marketplace routes: user-signed tokens only, account loaded from `users` into req.user. */
const authenticate = bearerAuth({ Model: User, tokens: tokenService, reqKey: 'user' });

/** Restricts a route to the given roles. Must run after authenticate. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

module.exports = { authenticate, authorize };
