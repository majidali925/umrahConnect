const ApiError = require('../utils/ApiError');

/**
 * Validates and sanitizes req[source] against a Joi schema. Unknown keys are stripped,
 * so controllers only ever see whitelisted, type-coerced values.
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req[source] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/["]/g, ''),
      }));
      // Object-level rules (e.g. cross-field checks) have no field; use the first as the message.
      const general = errors.find((e) => !e.field);
      throw ApiError.badRequest(general?.message || 'Validation failed', { code: 'VALIDATION_ERROR', errors });
    }

    // Express 5 exposes req.query as a getter, so validated values are stored separately.
    if (source === 'query') req.validatedQuery = value;
    else req[source] = value;
    next();
  };
}

module.exports = validate;
