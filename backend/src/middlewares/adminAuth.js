const { Admin } = require('../models');
const adminTokens = require('../services/adminToken.service');
const { bearerAuth } = require('./bearerAuth');

/** Admin routes: admin-signed tokens only, account loaded from `admins` into req.admin. */
const authenticateAdmin = bearerAuth({ Model: Admin, tokens: adminTokens, reqKey: 'admin' });

module.exports = { authenticateAdmin };
