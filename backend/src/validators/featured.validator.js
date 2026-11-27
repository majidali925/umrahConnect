const { Joi, objectId, pagination, reason } = require('./common');
const { FEATURE_REQUEST_STATES } = require('../constants');

// Sent as multipart/form-data when a payment proof file ("paymentProof") is attached.
const requestFeature = Joi.object({
  note: Joi.string().trim().max(1000).allow('').label('Note'),
});

// Empty filter values (e.g. "?state=") mean "no filter".
const listFeatureRequests = Joi.object({
  ...pagination,
  state: Joi.string().valid(...FEATURE_REQUEST_STATES).allow(''),
  search: Joi.string().trim().max(100).allow(''),
});

const idParam = Joi.object({ id: objectId.required() });
const approve = Joi.object({ note: Joi.string().trim().max(1000).allow('').label('Note') });
const reject = Joi.object({ reason: reason.required().label('Reason') });
const end = Joi.object({ reason: reason.required().label('Reason') });

module.exports = { requestFeature, listFeatureRequests, idParam, approve, reject, end };
