import apiClient, { unwrap } from './apiClient';

const progressHandler = (onProgress) => (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0);

/** PUTs a photo as multipart field "image". */
export function uploadImage(url, file, onProgress) {
  const form = new FormData();
  form.append('image', file);
  return unwrap(apiClient.put(url, form, { onUploadProgress: progressHandler(onProgress) }));
}

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
        onUploadProgress: progressHandler(onProgress),
      }),
    );
  },
  /** Header photo for the agency's public page. */
  uploadHeaderImage: (file, onProgress) => uploadImage('/agencies/me/header-image', file, onProgress),
  removeHeaderImage: () => unwrap(apiClient.delete('/agencies/me/header-image')),
  deleteDocument: (documentId) => unwrap(apiClient.delete(`/agencies/documents/${documentId}`)),
  /** Fetches a private document with the auth header and returns a Blob. */
  getDocumentBlob: (documentId) =>
    apiClient.get(`/agencies/documents/${documentId}/file`, { responseType: 'blob' }).then((res) => res.data),
};
