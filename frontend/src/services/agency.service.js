import apiClient, { unwrap } from './apiClient';

export const agencyService = {
  getMine: () => unwrap(apiClient.get('/agencies/me')),
  updateMine: (payload) => unwrap(apiClient.put('/agencies/me', payload)),
  submit: () => unwrap(apiClient.post('/agencies/onboarding')),
  getPublishingAccess: () => unwrap(apiClient.get('/agencies/publishing-access')),

  uploadDocument: (documentType, file, onProgress) => {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file);
    return unwrap(
      apiClient.post('/agencies/documents', form, {
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      }),
    );
  },
  deleteDocument: (documentId) => unwrap(apiClient.delete(`/agencies/documents/${documentId}`)),
  /** Fetches a private document with the auth header and returns a Blob. */
  getDocumentBlob: (documentId) =>
    apiClient.get(`/agencies/documents/${documentId}/file`, { responseType: 'blob' }).then((res) => res.data),
};
