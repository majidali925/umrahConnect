const packageService = require('../services/package.service');
const hotelLookup = require('../services/hotelLookup.service');
const { sendSuccess } = require('../utils/apiResponse');

/* Agency: packages (req.agency is loaded and approved by middleware) */

async function listMine(req, res) {
  const { items, meta } = await packageService.listMyPackages(req.agency, req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function getMine(req, res) {
  sendSuccess(res, { data: await packageService.getMyPackage(req.agency, req.params.packageId) });
}

async function create(req, res) {
  const data = await packageService.createPackage(req.user, req.agency, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Package created', data });
}

async function update(req, res) {
  const data = await packageService.updatePackage(req.user, req.agency, req.params.packageId, req.body);
  sendSuccess(res, { message: 'Package saved', data });
}

async function setStatus(req, res) {
  const data = await packageService.setPackageStatus(req.user, req.agency, req.params.packageId, req.body.status);
  sendSuccess(res, { message: data.status === 'PUBLISHED' ? 'Package published' : 'Package moved to drafts', data });
}

async function remove(req, res) {
  await packageService.deletePackage(req.user, req.agency, req.params.packageId);
  sendSuccess(res, { message: 'Package deleted' });
}

/** Hotel suggestions with their distance from the Haram, for the package form. */
async function searchHotels(req, res) {
  const { city, q } = req.validatedQuery;
  sendSuccess(res, { data: await hotelLookup.searchHotels(city, q) });
}

/* Agency: quotation requests */

async function listAgencyQuotations(req, res) {
  const { items, meta } = await packageService.listAgencyQuotations(req.agency, req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function confirmQuotation(req, res) {
  const data = await packageService.confirmQuotation(req.user, req.agency, req.params.quotationId, req.body);
  sendSuccess(res, { message: 'Booking confirmed', data });
}

async function declineQuotation(req, res) {
  const data = await packageService.declineQuotation(req.user, req.agency, req.params.quotationId, req.body);
  sendSuccess(res, { message: 'Request declined', data });
}

async function cancelBooking(req, res) {
  const data = await packageService.cancelConfirmedQuotation(req.user, req.agency, req.params.quotationId, req.body);
  sendSuccess(res, { message: 'Booking cancelled and seats released', data });
}

/* Public catalogue */

async function browse(req, res) {
  const { items, meta } = await packageService.browsePackages(req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function departureCities(_req, res) {
  sendSuccess(res, { data: await packageService.listDepartureCities() });
}

async function getPublic(req, res) {
  sendSuccess(res, { data: await packageService.getPublicPackage(req.params.packageId) });
}

/* Customer: quotation requests */

async function requestQuotation(req, res) {
  const data = await packageService.requestQuotation(req.user, req.params.packageId, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Request sent to the agency', data });
}

async function listMyQuotations(req, res) {
  const { items, meta } = await packageService.listMyQuotations(req.user, req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function cancelMyQuotation(req, res) {
  const data = await packageService.cancelMyQuotation(req.user, req.params.quotationId);
  sendSuccess(res, { message: 'Request withdrawn', data });
}

module.exports = {
  searchHotels,
  listMine,
  getMine,
  create,
  update,
  setStatus,
  remove,
  listAgencyQuotations,
  confirmQuotation,
  declineQuotation,
  cancelBooking,
  browse,
  departureCities,
  getPublic,
  requestQuotation,
  listMyQuotations,
  cancelMyQuotation,
};
