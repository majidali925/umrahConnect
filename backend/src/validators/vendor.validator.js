const { Joi, objectId, pagination } = require('./common');

const agencyIdParam = Joi.object({ agencyId: objectId.required() });

const listReviews = Joi.object({
  ...pagination,
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const submitReview = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().label('Rating').messages({
    'any.required': 'Please choose a star rating',
  }),
  comment: Joi.string().trim().max(1000).allow('').default('').label('Review'),
});

module.exports = { agencyIdParam, listReviews, submitReview };
