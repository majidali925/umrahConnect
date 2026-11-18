const { Joi, objectId, pagination, reason } = require('./common');
const { AGENCY_STATUS, VENDOR_TYPES, ROLES, AUDIT_ACTIONS, ENTITY_TYPES, DOCUMENT_STATUS } = require('../constants');

const idParam = Joi.object({ id: objectId.required() });
const documentParams = Joi.object({ id: objectId.required(), documentId: objectId.required() });

const listAgencies = Joi.object({
  ...pagination,
  status: Joi.string().valid(...Object.values(AGENCY_STATUS)),
  vendorType: Joi.string().valid(...Object.values(VENDOR_TYPES)),
  search: Joi.string().trim().max(100).allow(''),
});

const listUsers = Joi.object({
  ...pagination,
  role: Joi.string().valid(...Object.values(ROLES)),
  isActive: Joi.boolean(),
  search: Joi.string().trim().max(100).allow(''),
});

const listAuditLogs = Joi.object({
  ...pagination,
  action: Joi.string().valid(...Object.values(AUDIT_ACTIONS)),
  entityType: Joi.string().valid(...Object.values(ENTITY_TYPES)),
  entityId: objectId,
});

const approve = Joi.object({ note: Joi.string().trim().max(1000).allow('') });
const reject = Joi.object({ reason: reason.required().label('Rejection reason') });
const suspend = Joi.object({ reason: reason.required().label('Suspension reason') });

const reviewDocument = Joi.object({
  status: Joi.string().valid(DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.REJECTED).required(),
  reason: Joi.when('status', {
    is: DOCUMENT_STATUS.REJECTED,
    then: reason.required().label('Rejection reason'),
    otherwise: Joi.forbidden(),
  }),
});

module.exports = { idParam, documentParams, listAgencies, listUsers, listAuditLogs, approve, reject, suspend, reviewDocument };
