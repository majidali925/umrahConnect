const { Joi, objectId, pagination, reason } = require('./common');
const { PACKAGE_STATUS, ROOM_TYPES, PACKAGE_INCLUSIONS, QUOTATION_STATUS } = require('../constants');
const { HOLY_CITIES } = require('../constants/holySites');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 730; // packages can be listed up to two years out

const hotel = (label) =>
  Joi.object({
    name: Joi.string().trim().min(2).max(150).required().label(`${label} hotel name`),
    stars: Joi.number().integer().min(1).max(5).required().label(`${label} hotel stars`),
    distanceMeters: Joi.number().integer().min(0).max(50000).required().label(`${label} hotel distance from Haram`),
    nights: Joi.number().integer().min(0).max(60).required().label(`Nights in ${label}`),
  })
    .required()
    .label(`${label} hotel`);

/**
 * Full package payload, used for both create and update (PUT). Departure must be in the
 * future ('now' is evaluated at validation time) and return must come after departure.
 */
const packageBody = Joi.object({
  title: Joi.string().trim().min(5).max(150).required().label('Title'),
  description: Joi.string().trim().min(20).max(3000).required().label('Description'),
  departureCity: Joi.string().trim().min(2).max(80).required().label('Departure city'),
  departureDate: Joi.date()
    .greater('now')
    .required()
    .label('Departure date')
    .messages({ 'date.greater': 'Departure date must be in the future' }),
  returnDate: Joi.date()
    .greater(Joi.ref('departureDate'))
    .required()
    .label('Return date')
    .messages({ 'date.greater': 'Return date must be after the departure date' }),
  makkahHotel: hotel('Makkah'),
  madinahHotel: hotel('Madinah'),
  roomType: Joi.string()
    .valid(...Object.values(ROOM_TYPES))
    .required()
    .label('Room sharing'),
  pricePerPerson: Joi.number().integer().min(1000).max(10000000).required().label('Price per person'),
  inclusions: Joi.array()
    .items(Joi.string().valid(...Object.values(PACKAGE_INCLUSIONS)))
    .unique()
    .default([])
    .label('Inclusions'),
  totalSeats: Joi.number().integer().min(1).max(1000).required().label('Seat quota'),
  status: Joi.string()
    .valid(...Object.values(PACKAGE_STATUS))
    .default(PACKAGE_STATUS.DRAFT)
    .label('Status'),
}).custom((value, helpers) => {
  if (value.departureDate.getTime() > Date.now() + MAX_DAYS_AHEAD * DAY_MS) {
    return helpers.message('Departure date must be within the next two years');
  }
  if (value.makkahHotel.nights + value.madinahHotel.nights < 1) {
    return helpers.message('Add at least one night in Makkah or Madinah');
  }
  return value;
});

const searchHotels = Joi.object({
  city: Joi.string()
    .valid(...Object.values(HOLY_CITIES))
    .required()
    .label('City'),
  q: Joi.string().trim().min(3).max(100).required().label('Hotel name'),
});

const packageIdParam = Joi.object({ packageId: objectId.required() });
const quotationIdParam = Joi.object({ quotationId: objectId.required() });

const setPackageStatus = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PACKAGE_STATUS))
    .required()
    .label('Status'),
});

// Empty filter values (e.g. "?status=") mean "no filter".
const listMyPackages = Joi.object({
  ...pagination,
  status: Joi.string().valid(...Object.values(PACKAGE_STATUS)).allow(''),
  search: Joi.string().trim().max(100).allow(''),
});

const browsePackages = Joi.object({
  ...pagination,
  limit: Joi.number().integer().min(1).max(50).default(12),
  search: Joi.string().trim().max(100).allow(''),
  departureCity: Joi.string().trim().max(80).allow(''),
  agencyId: objectId.allow('').label('Agency'),
  from: Joi.date(),
  to: Joi.date(),
  maxPrice: Joi.number().integer().min(1),
  sort: Joi.string().valid('departure', 'price_asc', 'price_desc', 'newest').default('departure'),
});

const listQuotations = Joi.object({
  ...pagination,
  status: Joi.string().valid(...Object.values(QUOTATION_STATUS)).allow(''),
  packageId: objectId.allow(''),
});

const requestQuotation = Joi.object({
  seats: Joi.number().integer().min(1).max(1000).required().label('Number of persons'),
  message: Joi.string().trim().max(1000).allow('').label('Message'),
});

const confirmQuotation = Joi.object({ note: Joi.string().trim().max(1000).allow('').label('Note') });
const declineQuotation = Joi.object({ reason: reason.required().label('Reason') });
const cancelQuotation = Joi.object({ reason: Joi.string().trim().max(1000).allow('').label('Reason') });

module.exports = {
  packageBody,
  searchHotels,
  packageIdParam,
  quotationIdParam,
  setPackageStatus,
  listMyPackages,
  browsePackages,
  listQuotations,
  requestQuotation,
  confirmQuotation,
  declineQuotation,
  cancelQuotation,
};
