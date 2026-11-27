const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/apiResponse');
const { sendPrivateFile } = require('../utils/sendFile');

async function dashboard(_req, res) {
  sendSuccess(res, { data: await adminService.getDashboard() });
}

async function listAgencies(req, res) {
  const { items, meta } = await adminService.listAgencies(req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function getAgency(req, res) {
  sendSuccess(res, { data: await adminService.getAgencyDetail(req.params.id) });
}

async function startReview(req, res) {
  const data = await adminService.startReview(req.params.id, req.admin);
  sendSuccess(res, { message: 'Application marked as under review', data });
}

async function approve(req, res) {
  const data = await adminService.approveAgency(req.params.id, req.admin, req.body);
  sendSuccess(res, { message: 'Application approved', data });
}

async function reject(req, res) {
  const data = await adminService.rejectAgency(req.params.id, req.admin, req.body);
  sendSuccess(res, { message: 'Application rejected', data });
}

async function suspend(req, res) {
  const data = await adminService.suspendAgency(req.params.id, req.admin, req.body);
  sendSuccess(res, { message: 'Vendor disabled. Their packages are hidden from customers.', data });
}

async function reinstate(req, res) {
  const data = await adminService.reinstateAgency(req.params.id, req.admin);
  sendSuccess(res, { message: 'Vendor enabled. Their published packages are visible again.', data });
}

async function reviewDocument(req, res) {
  const data = await adminService.reviewDocument(req.params.id, req.params.documentId, req.admin, req.body);
  sendSuccess(res, { message: 'Document review saved', data });
}

async function viewDocument(req, res) {
  await sendPrivateFile(res, await adminService.getDocumentFile(req.params.id, req.params.documentId, req.admin));
}

async function listUsers(req, res) {
  const { items, meta } = await adminService.listUsers(req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

async function listAuditLogs(req, res) {
  const { items, meta } = await adminService.listAuditLogs(req.validatedQuery);
  sendSuccess(res, { data: items, meta });
}

module.exports = {
  dashboard,
  listAgencies,
  getAgency,
  startReview,
  approve,
  reject,
  suspend,
  reinstate,
  reviewDocument,
  viewDocument,
  listUsers,
  listAuditLogs,
};
