const vendorService = require('../services/vendor.service');
const packageService = require('../services/package.service');
const reviewService = require('../services/review.service');
const { sendSuccess } = require('../utils/apiResponse');

/* Public agency page */

async function getPublicProfile(req, res) {
  sendSuccess(res, { data: await vendorService.getPublicProfile(req.params.agencyId) });
}

async function listReviews(req, res) {
  const { items, meta } = await vendorService.listPublicReviews(req.params.agencyId, req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

/* Vendor: photos (req.agency is loaded and approved by middleware) */

async function setHeaderImage(req, res) {
  const data = await vendorService.setHeaderImage(req.user, req.agency, req.file);
  sendSuccess(res, { message: 'Header photo updated', data });
}

async function removeHeaderImage(req, res) {
  const data = await vendorService.removeHeaderImage(req.user, req.agency);
  sendSuccess(res, { message: 'Header photo removed', data });
}

async function setCoverImage(req, res) {
  const data = await packageService.setCoverImage(req.user, req.agency, req.params.packageId, req.file);
  sendSuccess(res, { message: 'Cover photo updated', data });
}

async function removeCoverImage(req, res) {
  const data = await packageService.removeCoverImage(req.user, req.agency, req.params.packageId);
  sendSuccess(res, { message: 'Cover photo removed', data });
}

/* Customer: reviews */

async function submitReview(req, res) {
  const { review, created } = await reviewService.submitReview(req.user, req.params.quotationId, req.body);
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Thank you for your review' : 'Review updated',
    data: review,
  });
}

module.exports = {
  getPublicProfile,
  listReviews,
  setHeaderImage,
  removeHeaderImage,
  setCoverImage,
  removeCoverImage,
  submitReview,
};
