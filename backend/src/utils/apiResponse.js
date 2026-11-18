/**
 * Every successful response has the shape:
 *   { success: true, message, data, meta? }
 * Errors (see errorHandler) have the shape:
 *   { success: false, message, code, errors? }
 */
function sendSuccess(res, { statusCode = 200, message = 'OK', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess };
