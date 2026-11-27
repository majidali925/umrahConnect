import apiClient, { unwrap } from './apiClient';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const adminService = {
  getDashboard: () => unwrap(apiClient.get('/admin/dashboard')),

  listAgencies: (params) => unwrap(apiClient.get('/admin/agencies', { params: clean(params) })),
  getAgency: (id) => unwrap(apiClient.get(`/admin/agencies/${id}`)),
  startReview: (id) => unwrap(apiClient.patch(`/admin/agencies/${id}/review`)),
  approve: (id, note) => unwrap(apiClient.patch(`/admin/agencies/${id}/approve`, note ? { note } : {})),
  reject: (id, reason) => unwrap(apiClient.patch(`/admin/agencies/${id}/reject`, { reason })),
  suspend: (id, reason) => unwrap(apiClient.patch(`/admin/agencies/${id}/suspend`, { reason })),
  reinstate: (id) => unwrap(apiClient.patch(`/admin/agencies/${id}/reinstate`)),
  reviewDocument: (id, documentId, status, reason) =>
    unwrap(
      apiClient.patch(`/admin/agencies/${id}/documents/${documentId}/review`, reason ? { status, reason } : { status }),
    ),
  getDocumentBlob: (id, documentId) =>
    apiClient
      .get(`/admin/agencies/${id}/documents/${documentId}/file`, { responseType: 'blob' })
      .then((res) => res.data),

  listFeatureRequests: (params) => unwrap(apiClient.get('/admin/feature-requests', { params: clean(params) })),
  getFeaturePaymentProofBlob: (id) =>
    apiClient.get(`/admin/feature-requests/${id}/payment-proof`, { responseType: 'blob' }).then((res) => res.data),
  approveFeature: (id, note) => unwrap(apiClient.patch(`/admin/feature-requests/${id}/approve`, note ? { note } : {})),
  rejectFeature: (id, reason) => unwrap(apiClient.patch(`/admin/feature-requests/${id}/reject`, { reason })),
  endFeature: (id, reason) => unwrap(apiClient.patch(`/admin/feature-requests/${id}/end`, { reason })),

  listUsers: (params) => unwrap(apiClient.get('/admin/users', { params: clean(params) })),
  listAuditLogs: (params) => unwrap(apiClient.get('/admin/audit-logs', { params: clean(params) })),
};
