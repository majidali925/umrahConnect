const { AuditLog } = require('../models');

/**
 * Records an audit entry. Failures are logged but never interrupt the main action,
 * except that callers await it so entries are ordered and present for the response.
 * actorModel is 'User' (default) for marketplace users and 'Admin' for platform admins.
 */
async function record({ performedBy = null, actorModel = 'User', action, entityType, entityId, metadata = {} }) {
  try {
    await AuditLog.create({ performedBy, performedByModel: actorModel, action, entityType, entityId, metadata });
  } catch (err) {
    console.error(`[audit] Failed to record ${action}: ${err.message}`);
  }
}

module.exports = { record };
