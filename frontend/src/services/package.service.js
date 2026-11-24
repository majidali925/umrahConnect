import apiClient, { unwrap } from './apiClient';
import { uploadImage } from './agency.service';

// Drop empty filters so "All" options don't send e.g. "?status=".
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

/** Approved agencies: manage their own packages and respond to seat requests. */
export const agencyPackageService = {
  list: (params) => unwrap(apiClient.get('/agencies/packages', { params: clean(params) })),
  get: (id) => unwrap(apiClient.get(`/agencies/packages/${id}`)),
  create: (payload) => unwrap(apiClient.post('/agencies/packages', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/agencies/packages/${id}`, payload)),
  setStatus: (id, status) => unwrap(apiClient.patch(`/agencies/packages/${id}/status`, { status })),
  remove: (id) => unwrap(apiClient.delete(`/agencies/packages/${id}`)),
  /** Cover photo shown behind the package on cards and its page. */
  uploadCoverImage: (id, file, onProgress) => uploadImage(`/agencies/packages/${id}/cover-image`, file, onProgress),
  removeCoverImage: (id) => unwrap(apiClient.delete(`/agencies/packages/${id}/cover-image`)),
  /** Hotels near the Haram of 'MAKKAH' or 'MADINAH', each with its distanceMeters from the mosque. */
  searchHotels: (city, q) => unwrap(apiClient.get('/agencies/hotels/search', { params: { city, q } })),

  listQuotations: (params) => unwrap(apiClient.get('/agencies/quotations', { params: clean(params) })),
  confirmQuotation: (id, note) => unwrap(apiClient.patch(`/agencies/quotations/${id}/confirm`, { note })),
  declineQuotation: (id, reason) => unwrap(apiClient.patch(`/agencies/quotations/${id}/decline`, { reason })),
  cancelBooking: (id, reason) => unwrap(apiClient.patch(`/agencies/quotations/${id}/cancel`, { reason })),
};

/** Public catalogue plus the signed-in customer's seat requests. */
export const packageService = {
  browse: (params) => unwrap(apiClient.get('/packages', { params: clean(params) })),
  departureCities: () => unwrap(apiClient.get('/packages/departure-cities')),
  get: (id) => unwrap(apiClient.get(`/packages/${id}`)),

  requestSeats: (id, payload) => unwrap(apiClient.post(`/packages/${id}/quotations`, payload)),
  myQuotations: (params) => unwrap(apiClient.get('/quotations', { params: clean(params) })),
  withdrawQuotation: (id) => unwrap(apiClient.patch(`/quotations/${id}/cancel`)),
  /** Rate the agency after a completed trip; creates or updates the customer's review. */
  submitReview: (quotationId, payload) => unwrap(apiClient.put(`/quotations/${quotationId}/review`, payload)),
};

/** Public agency pages. An agency's packages come from packageService.browse({ agencyId }). */
export const vendorService = {
  get: (agencyId) => unwrap(apiClient.get(`/vendors/${agencyId}`)),
  reviews: (agencyId, params) => unwrap(apiClient.get(`/vendors/${agencyId}/reviews`, { params: clean(params) })),
};
