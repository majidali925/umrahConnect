const ApiError = require('../utils/ApiError');
const agencyService = require('../services/agency.service');
const { AGENCY_STATUS } = require('../constants');

/** Attaches the authenticated vendor's agency to req.agency. */
async function loadMyAgency(req, _res, next) {
  req.agency = await agencyService.getAgencyByUserId(req.user._id);
  next();
}

/** Allows the request only while the application is DRAFT or REJECTED. */
function requireEditableAgency(req, _res, next) {
  agencyService.assertEditable(req.agency);
  next();
}

/**
 * Gate for all vendor publishing functionality (packages etc. in later phases).
 * Only APPROVED agencies with an active user account pass; SUSPENDED and every
 * other status is refused.
 */
function requireApprovedAgency(req, _res, next) {
  const status = req.agency?.verificationStatus;
  if (status !== AGENCY_STATUS.APPROVED) {
    const message =
      status === AGENCY_STATUS.SUSPENDED
        ? 'Your vendor account is suspended. Publishing is disabled.'
        : 'Your vendor account must be approved before you can publish.';
    throw ApiError.forbidden(message, { code: status === AGENCY_STATUS.SUSPENDED ? 'AGENCY_SUSPENDED' : 'AGENCY_NOT_APPROVED' });
  }
  next();
}

module.exports = { loadMyAgency, requireEditableAgency, requireApprovedAgency };
