const mongoose = require('mongoose');
const { Quotation, Review } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const audit = require('./audit.service');
const { QUOTATION_STATUS, AUDIT_ACTIONS, ENTITY_TYPES } = require('../constants');

/** "Ahmed Khan" -> "Ahmed K.": enough to feel personal without publishing a customer's full name. */
function displayName(fullName) {
  const [first, ...rest] = String(fullName || '').trim().split(/\s+/);
  if (!first) return 'Verified traveller';
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/** Average rating, review count and how many reviews gave each star rating. */
async function ratingSummary(agencyId) {
  const rows = await Review.aggregate([
    { $match: { agencyId: new mongoose.Types.ObjectId(String(agencyId)) } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let count = 0;
  let total = 0;
  for (const { _id: rating, count: n } of rows) {
    distribution[rating] = n;
    count += n;
    total += rating * n;
  }
  return { average: count ? Math.round((total / count) * 10) / 10 : null, count, distribution };
}

function publicReview(review) {
  return {
    _id: review._id,
    rating: review.rating,
    comment: review.comment || null,
    packageTitle: review.packageTitle || null,
    reviewerName: displayName(review.customerId?.fullName),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

/** Newest first. The caller has already checked that the agency is public. */
async function listAgencyReviews(agencyId, query) {
  const pagination = getPagination(query);
  const filter = { agencyId };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('customerId', 'fullName'),
    Review.countDocuments(filter),
  ]);
  return { items: items.map(publicReview), meta: buildMeta(pagination, total) };
}

/** A booking can be reviewed once it was confirmed and the trip has ended. */
function canReview(quotation, pkg) {
  return quotation.status === QUOTATION_STATUS.CONFIRMED && Boolean(pkg?.returnDate) && pkg.returnDate <= new Date();
}

/** The customer's own reviews for the given quotations, keyed by quotation id. */
async function reviewsForQuotations(customerId, quotationIds) {
  const reviews = await Review.find({ customerId, quotationId: { $in: quotationIds } });
  return Object.fromEntries(reviews.map((r) => [String(r.quotationId), r]));
}

/** Creates the customer's review of a completed booking, or updates it if they already wrote one. */
async function submitReview(customer, quotationId, { rating, comment }) {
  const quotation = await Quotation.findOne({ _id: quotationId, customerId: customer._id }).populate(
    'packageId',
    'title returnDate',
  );
  if (!quotation) throw ApiError.notFound('Booking not found');
  const pkg = quotation.packageId;
  if (quotation.status !== QUOTATION_STATUS.CONFIRMED) {
    throw ApiError.forbidden('Only confirmed bookings can be reviewed', { code: 'REVIEW_NOT_ALLOWED' });
  }
  if (!canReview(quotation, pkg)) {
    throw ApiError.forbidden('You can review this agency once your trip has ended', { code: 'TRIP_NOT_COMPLETED' });
  }

  const existing = await Review.findOne({ quotationId: quotation._id });
  let review;
  if (existing) {
    existing.rating = rating;
    existing.comment = comment || undefined;
    review = await existing.save();
  } else {
    review = await Review.create({
      agencyId: quotation.agencyId,
      packageId: pkg._id,
      quotationId: quotation._id,
      customerId: customer._id,
      rating,
      comment: comment || undefined,
      packageTitle: pkg.title,
    }).catch((err) => {
      if (err.code !== 11000) throw err;
      throw ApiError.conflict('You have already reviewed this booking. Reload to edit your review.');
    });
  }

  await audit.record({
    performedBy: customer._id,
    action: existing ? AUDIT_ACTIONS.REVIEW_UPDATED : AUDIT_ACTIONS.REVIEW_SUBMITTED,
    entityType: ENTITY_TYPES.REVIEW,
    entityId: review._id,
    metadata: { agencyId: quotation.agencyId, quotationId: quotation._id, rating },
  });
  return { review: review.toJSON(), created: !existing };
}

module.exports = { ratingSummary, listAgencyReviews, canReview, reviewsForQuotations, submitReview, displayName };
