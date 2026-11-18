const { Admin } = require('../models');
const ApiError = require('../utils/ApiError');
const { AUDIT_ACTIONS, ENTITY_TYPES } = require('../constants');
const adminTokens = require('./adminToken.service');
const { createSessionStore } = require('./sessionStore');
const audit = require('./audit.service');

const ACTOR = { actorModel: 'Admin' };

const sessions = createSessionStore({
  Model: Admin,
  tokens: adminTokens,
  onReuse: (admin) =>
    audit.record({
      ...ACTOR,
      performedBy: admin._id,
      action: AUDIT_ACTIONS.REFRESH_TOKEN_REUSE,
      entityType: ENTITY_TYPES.ADMIN,
      entityId: admin._id,
    }),
});

const buildSession = (admin) => ({ admin: admin.toPublic() });

async function login({ email, password }, { ip } = {}) {
  const admin = await Admin.findOne({ email }).select(sessions.SECRET_FIELDS);
  // Same message for unknown account and wrong password, to prevent account enumeration.
  if (!admin || !(await admin.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password', { code: 'INVALID_CREDENTIALS' });
  }
  if (!admin.isActive) {
    throw ApiError.forbidden('This admin account has been deactivated.', { code: 'ACCOUNT_DISABLED' });
  }

  const tokens = await sessions.issue(admin);
  admin.lastLoginAt = new Date();
  await Admin.updateOne({ _id: admin._id }, { lastLoginAt: admin.lastLoginAt });
  await audit.record({
    ...ACTOR,
    performedBy: admin._id,
    action: AUDIT_ACTIONS.ADMIN_LOGGED_IN,
    entityType: ENTITY_TYPES.ADMIN,
    entityId: admin._id,
    metadata: ip ? { ip } : {},
  });
  return { ...buildSession(admin), ...tokens };
}

async function refresh(refreshToken) {
  const { account, ...tokens } = await sessions.rotate(refreshToken);
  return { ...buildSession(account), ...tokens };
}

const logout = (refreshToken) => sessions.revoke(refreshToken);

module.exports = { login, refresh, logout, buildSession };
