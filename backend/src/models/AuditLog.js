const mongoose = require('mongoose');
const { AUDIT_ACTIONS, ENTITY_TYPES } = require('../constants');

const auditLogSchema = new mongoose.Schema(
  {
    // null for system-initiated actions. Points at a User or an Admin (see performedByModel).
    performedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'performedByModel', default: null },
    performedByModel: { type: String, enum: ['User', 'Admin'], default: 'User' },
    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true },
    entityType: { type: String, enum: Object.values(ENTITY_TYPES), required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
