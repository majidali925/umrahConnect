const featuredService = require('../services/featured.service');
const { sendSuccess } = require('../utils/apiResponse');
const { sendPrivateFile } = require('../utils/sendFile');

/* Agency (req.agency is loaded and approved by middleware) */

/** The pre-filled application and fixed offer, shown before the agency sends it. */
async function preview(req, res) {
  sendSuccess(res, { data: await featuredService.getApplicationPreview(req.user, req.agency, req.params.packageId) });
}

async function request(req, res) {
  const data = await featuredService.requestFeature(req.user, req.agency, req.params.packageId, req.body, req.file);
  sendSuccess(res, {
    statusCode: 201,
    message: data.hasPaymentProof
      ? 'Application sent with your payment proof. Our team will review it first.'
      : 'Application sent. Your package will be featured once our team approves it.',
    data,
  });
}

async function withdraw(req, res) {
  const data = await featuredService.withdrawFeatureRequest(req.user, req.agency, req.params.packageId);
  sendSuccess(res, { message: 'Feature request withdrawn', data });
}

/* Admin */

async function list(req, res) {
  const { items, meta } = await featuredService.listFeatureRequests(req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function viewPaymentProof(req, res) {
  await sendPrivateFile(res, await featuredService.getPaymentProof(req.params.id));
}

async function approve(req, res) {
  const data = await featuredService.approveFeatureRequest(req.params.id, req.admin, req.body);
  sendSuccess(res, { message: 'Request approved. The package is now featured.', data });
}

async function reject(req, res) {
  const data = await featuredService.rejectFeatureRequest(req.params.id, req.admin, req.body);
  sendSuccess(res, { message: 'Request rejected', data });
}

async function end(req, res) {
  const data = await featuredService.endFeaturing(req.params.id, req.admin, req.body);
  sendSuccess(res, { message: 'Featuring ended', data });
}

module.exports = { preview, request, withdraw, list, viewPaymentProof, approve, reject, end };
