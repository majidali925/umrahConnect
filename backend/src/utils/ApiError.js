class ApiError extends Error {
  constructor(statusCode, message, { code, errors } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message = 'Bad request', opts) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...opts });
  }

  static unauthorized(message = 'Authentication required', opts) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED', ...opts });
  }

  static forbidden(message = 'You do not have permission to perform this action', opts) {
    return new ApiError(403, message, { code: 'FORBIDDEN', ...opts });
  }

  static notFound(message = 'Resource not found', opts) {
    return new ApiError(404, message, { code: 'NOT_FOUND', ...opts });
  }

  static conflict(message = 'Resource already exists', opts) {
    return new ApiError(409, message, { code: 'CONFLICT', ...opts });
  }

  static tooMany(message = 'Too many requests, please try again later', opts) {
    return new ApiError(429, message, { code: 'TOO_MANY_REQUESTS', ...opts });
  }
}

module.exports = ApiError;
