const { Agency, Package } = require('../models');
const ApiError = require('../utils/ApiError');
const audit = require('./audit.service');
const storage = require('./storage.service');
const packageService = require('./package.service');
const reviewService = require('./review.service');
const { AGENCY_STATUS, AUDIT_ACTIONS, ENTITY_TYPES } = require('../constants');

/* ------------------------------------------------------------------ */
/* Public agency page                                                  */
/* ------------------------------------------------------------------ */

/** Only approved agencies have a public page; anything else is reported as not found. */
async function findPublicAgency(agencyId) {
  const agency = await Agency.findOne({ _id: agencyId, verificationStatus: AGENCY_STATUS.APPROVED });
  if (!agency) throw ApiError.notFound('This agency is not available', { code: 'AGENCY_NOT_FOUND' });
  return agency;
}

/**
 * Public profile: business details, header photo, rating summary and how many packages are
 * listed. Contact details stay private; customers get them once a booking is confirmed.
 */
async function getPublicProfile(agencyId) {
  const agency = await findPublicAgency(agencyId);
  const filter = await packageService.publicFilter();
  filter.agencyId = agency._id;
  const [rating, packageCount] = await Promise.all([
    reviewService.ratingSummary(agency._id),
    Package.countDocuments(filter),
  ]);
  return {
    ...packageService.publicAgency(agency),
    description: agency.description || null,
    headerImage: agency.toJSON().headerImage,
    rating,
    packageCount,
  };
}

async function listPublicReviews(agencyId, query) {
  const agency = await findPublicAgency(agencyId);
  return reviewService.listAgencyReviews(agency._id, query);
}

/* ------------------------------------------------------------------ */
/* Vendor: header photo                                                */
/* ------------------------------------------------------------------ */

async function setHeaderImage(user, agency, file) {
  const image = await storage.saveImage(file.buffer, { folder: `agencies/${agency._id}/header` });
  const previous = agency.headerImage?.publicId;
  await Agency.updateOne({ _id: agency._id }, { $set: { headerImage: image } });
  if (previous) await storage.deleteImage(previous);

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.AGENCY_UPDATED,
    entityType: ENTITY_TYPES.AGENCY,
    entityId: agency._id,
    metadata: { fields: ['headerImage'] },
  });
  return { headerImage: { url: image.url } };
}

async function removeHeaderImage(user, agency) {
  const previous = agency.headerImage?.publicId;
  if (previous) {
    await Agency.updateOne({ _id: agency._id }, { $unset: { headerImage: 1 } });
    await storage.deleteImage(previous);
    await audit.record({
      performedBy: user._id,
      action: AUDIT_ACTIONS.AGENCY_UPDATED,
      entityType: ENTITY_TYPES.AGENCY,
      entityId: agency._id,
      metadata: { fields: ['headerImage'], removed: true },
    });
  }
  return { headerImage: null };
}

module.exports = { getPublicProfile, listPublicReviews, setHeaderImage, removeHeaderImage };
