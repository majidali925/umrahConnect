const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. Maximum size is ${env.uploads.maxFileSizeMb} MB`
        : err.message;
    return ApiError.badRequest(message, { code: 'UPLOAD_ERROR' });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest('Validation failed', { code: 'VALIDATION_ERROR', errors });
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`, { code: 'INVALID_ID' });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`An account with this ${field} already exists`, {
      code: 'DUPLICATE',
      errors: [{ field, message: `This ${field} is already registered` }],
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON body', { code: 'INVALID_JSON' });
  }

  if (err?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large', { code: 'PAYLOAD_TOO_LARGE' });
  }

  return new ApiError(500, 'Something went wrong. Please try again later.', { code: 'INTERNAL_ERROR' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const apiError = normalizeError(err);

  if (apiError.statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { success: false, message: apiError.message, code: apiError.code };
  if (apiError.errors?.length) body.errors = apiError.errors;
  if (!env.isProduction && apiError.statusCode >= 500) body.stack = err.stack;

  res.status(apiError.statusCode).json(body);
}

module.exports = { notFound, errorHandler };
