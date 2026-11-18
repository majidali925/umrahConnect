/** Human-readable message from an Axios error or API error envelope. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error.message === 'Network Error') return 'Cannot reach the server. Check your connection and try again.';
  return fallback;
}

export const getErrorCode = (error) => error?.response?.data?.code;

/**
 * Maps server-side field errors onto Formik fields. Returns true if any field matched,
 * so callers can decide whether a general alert is still needed.
 */
export function applyServerErrors(error, setErrors, fieldMap = {}) {
  const errors = error?.response?.data?.errors;
  if (!Array.isArray(errors)) return false;
  const mapped = {};
  for (const { field, message } of errors) {
    if (field) mapped[fieldMap[field] || field] = message;
  }
  // Errors without a field (cross-field rules) fall through to the caller's general alert.
  if (!Object.keys(mapped).length) return false;
  setErrors(mapped);
  return true;
}
