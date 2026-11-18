const agencyService = require('../services/agency.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const { sendPrivateFile } = require('../utils/sendFile');

async function getMyAgency(req, res) {
  sendSuccess(res, { data: await agencyService.getMyAgency(req.user) });
}

async function updateMyAgency(req, res) {
  const data = await agencyService.updateMyAgency(req.user, req.body);
  sendSuccess(res, { message: 'Application saved', data });
}

async function uploadDocument(req, res) {
  if (!req.file) throw ApiError.badRequest('Please choose a file to upload', { code: 'FILE_REQUIRED' });
  const document = await agencyService.addDocument(req.user, req.agency, req.file, req.body.documentType);
  sendSuccess(res, { statusCode: 201, message: 'Document uploaded', data: document });
}

async function deleteDocument(req, res) {
  await agencyService.deleteDocument(req.user, req.params.documentId);
  sendSuccess(res, { message: 'Document removed' });
}

async function viewDocument(req, res) {
  await sendPrivateFile(res, await agencyService.getMyDocumentFile(req.user, req.params.documentId));
}

async function submitApplication(req, res) {
  const data = await agencyService.submitApplication(req.user);
  sendSuccess(res, { message: 'Application submitted for verification', data });
}

async function getVerificationStatus(req, res) {
  sendSuccess(res, { data: await agencyService.getVerificationStatus(req.user) });
}

/** Placeholder for future publishing features: reachable only by approved agencies. */
async function getPublishingAccess(req, res) {
  sendSuccess(res, {
    message: 'Your agency is approved to publish',
    data: { canPublish: true, agencyId: req.agency._id },
  });
}

module.exports = {
  getMyAgency,
  updateMyAgency,
  uploadDocument,
  deleteDocument,
  viewDocument,
  submitApplication,
  getVerificationStatus,
  getPublishingAccess,
};
