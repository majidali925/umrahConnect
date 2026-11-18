const { Agency, Package, Quotation, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const audit = require('./audit.service');
const notification = require('./notification.service');
const {
  AGENCY_STATUS,
  PACKAGE_STATUS,
  QUOTATION_STATUS,
  VENDOR_TYPE_LABELS,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} = require('../constants');

// Agency fields that are safe to show to the public next to a package.
const PUBLIC_AGENCY_FIELDS = 'businessName vendorType city province experience approvedAt';
// Contact details are shared with a customer only once their booking is confirmed.
const CONTACT_AGENCY_FIELDS = `${PUBLIC_AGENCY_FIELDS} phone whatsapp email address`;
const CUSTOMER_FIELDS = 'fullName email phone';


/* ------------------------------------------------------------------ */
/* Agency: package CRUD                                                */
/* ------------------------------------------------------------------ */

async function findMyPackage(agency, packageId) {
  const pkg = await Package.findOne({ _id: packageId, agencyId: agency._id });
  if (!pkg) throw ApiError.notFound('Package not found');
  return pkg;
}

/** Quotation counts per status for each package id: { [id]: { PENDING: n, ... } } */
async function quotationCounts(packageIds) {
  const rows = await Quotation.aggregate([
    { $match: { packageId: { $in: packageIds } } },
    { $group: { _id: { packageId: '$packageId', status: '$status' }, count: { $sum: 1 } } },
  ]);
  const counts = {};
  for (const { _id, count } of rows) {
    const key = String(_id.packageId);
    counts[key] = { ...counts[key], [_id.status]: count };
  }
  return counts;
}

async function listMyPackages(agency, query) {
  const pagination = getPagination(query);
  const filter = { agencyId: agency._id };
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: regex }, { departureCity: regex }];
  }

  const [packages, total] = await Promise.all([
    Package.find(filter).sort({ departureDate: 1, createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Package.countDocuments(filter),
  ]);
  const counts = await quotationCounts(packages.map((p) => p._id));
  const items = packages.map((p) => ({ ...p.toJSON(), quotationCounts: counts[String(p._id)] || {} }));
  return { items, meta: buildMeta(pagination, total) };
}

async function getMyPackage(agency, packageId) {
  const pkg = await findMyPackage(agency, packageId);
  const counts = await quotationCounts([pkg._id]);
  return { ...pkg.toJSON(), quotationCounts: counts[String(pkg._id)] || {} };
}

async function createPackage(user, agency, data) {
  const pkg = await Package.create({
    ...data,
    agencyId: agency._id,
    createdBy: user._id,
    publishedAt: data.status === PACKAGE_STATUS.PUBLISHED ? new Date() : undefined,
  });
  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.PACKAGE_CREATED,
    entityType: ENTITY_TYPES.PACKAGE,
    entityId: pkg._id,
    metadata: { title: pkg.title, status: pkg.status },
  });
  return pkg.toJSON();
}

async function updatePackage(user, agency, packageId, data) {
  const pkg = await findMyPackage(agency, packageId);

  if (data.totalSeats < pkg.bookedSeats) {
    throw ApiError.badRequest(
      `Seat quota cannot be lower than the ${pkg.bookedSeats} seat(s) already confirmed`,
      { code: 'QUOTA_BELOW_BOOKED', errors: [{ field: 'totalSeats', message: `Must be at least ${pkg.bookedSeats}` }] },
    );
  }
  const datesChanged =
    +new Date(data.departureDate) !== +pkg.departureDate || +new Date(data.returnDate) !== +pkg.returnDate;
  if (datesChanged && pkg.bookedSeats > 0) {
    throw ApiError.conflict('Travel dates cannot be changed after bookings have been confirmed', {
      code: 'DATES_LOCKED',
    });
  }

  if (data.status === PACKAGE_STATUS.PUBLISHED && pkg.status !== PACKAGE_STATUS.PUBLISHED) data.publishedAt = new Date();
  // Re-checked atomically: a confirmation may have landed since we read the package.
  const saved = await Package.findOneAndUpdate(
    { _id: pkg._id, bookedSeats: datesChanged ? 0 : { $lte: data.totalSeats } },
    { $set: data },
    { returnDocument: 'after', runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Bookings changed while you were editing. Please reload and try again.');

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.PACKAGE_UPDATED,
    entityType: ENTITY_TYPES.PACKAGE,
    entityId: saved._id,
    metadata: { title: saved.title, status: saved.status },
  });
  return saved.toJSON();
}

async function setPackageStatus(user, agency, packageId, status) {
  const pkg = await findMyPackage(agency, packageId);
  if (pkg.status === status) return pkg.toJSON();
  if (status === PACKAGE_STATUS.PUBLISHED && pkg.isExpired) {
    throw ApiError.badRequest('This package has already departed. Update the dates before publishing it.', {
      code: 'PACKAGE_EXPIRED',
    });
  }

  pkg.status = status;
  if (status === PACKAGE_STATUS.PUBLISHED) pkg.publishedAt = new Date();
  await pkg.save();

  await audit.record({
    performedBy: user._id,
    action: status === PACKAGE_STATUS.PUBLISHED ? AUDIT_ACTIONS.PACKAGE_PUBLISHED : AUDIT_ACTIONS.PACKAGE_UNPUBLISHED,
    entityType: ENTITY_TYPES.PACKAGE,
    entityId: pkg._id,
    metadata: { title: pkg.title },
  });
  return pkg.toJSON();
}

/**
 * Deletes a package. Refused while it has pending requests or confirmed bookings, so no
 * customer is left with a reference to a package that no longer exists; unpublish instead.
 */
async function deletePackage(user, agency, packageId) {
  const pkg = await findMyPackage(agency, packageId);
  const active = await Quotation.countDocuments({
    packageId: pkg._id,
    status: { $in: [QUOTATION_STATUS.PENDING, QUOTATION_STATUS.CONFIRMED] },
  });
  if (active > 0) {
    throw ApiError.conflict(
      'This package has pending requests or confirmed bookings. Resolve them or unpublish the package instead.',
      { code: 'PACKAGE_HAS_BOOKINGS' },
    );
  }

  await Quotation.deleteMany({ packageId: pkg._id });
  await pkg.deleteOne();
  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.PACKAGE_DELETED,
    entityType: ENTITY_TYPES.PACKAGE,
    entityId: pkg._id,
    metadata: { title: pkg.title },
  });
}

/* ------------------------------------------------------------------ */
/* Public catalogue                                                    */
/* ------------------------------------------------------------------ */

const approvedAgencyIds = () => Agency.find({ verificationStatus: AGENCY_STATUS.APPROVED }).distinct('_id');

/** Filter for packages anyone may see: published, upcoming, from a currently approved agency. */
async function publicFilter() {
  return {
    status: PACKAGE_STATUS.PUBLISHED,
    departureDate: { $gt: new Date() },
    agencyId: { $in: await approvedAgencyIds() },
  };
}

function publicAgency(agency) {
  if (!agency) return null;
  const a = typeof agency.toJSON === 'function' ? agency.toJSON() : agency;
  return {
    _id: a._id,
    businessName: a.businessName,
    vendorType: a.vendorType,
    vendorTypeLabel: VENDOR_TYPE_LABELS[a.vendorType],
    city: a.city,
    province: a.province,
    experience: a.experience,
    verifiedSince: a.approvedAt,
  };
}

function publicPackage(pkg) {
  const json = pkg.toJSON();
  delete json.createdBy;
  delete json.publishedAt;
  json.agency = publicAgency(pkg.agencyId);
  delete json.agencyId;
  return json;
}

const SORTS = {
  departure: { departureDate: 1 },
  price_asc: { pricePerPerson: 1, departureDate: 1 },
  price_desc: { pricePerPerson: -1, departureDate: 1 },
  newest: { publishedAt: -1 },
};

async function browsePackages(query) {
  const pagination = getPagination(query);
  const filter = await publicFilter();
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: regex }, { departureCity: regex }, { 'makkahHotel.name': regex }, { 'madinahHotel.name': regex }];
  }
  if (query.departureCity) filter.departureCity = new RegExp(`^${escapeRegex(query.departureCity)}$`, 'i');
  if (query.from) filter.departureDate.$gte = query.from;
  if (query.to) filter.departureDate.$lte = query.to;
  if (query.maxPrice) filter.pricePerPerson = { $lte: query.maxPrice };

  const [packages, total] = await Promise.all([
    Package.find(filter)
      .sort(SORTS[query.sort] || SORTS.departure)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('agencyId', PUBLIC_AGENCY_FIELDS),
    Package.countDocuments(filter),
  ]);
  return { items: packages.map(publicPackage), meta: buildMeta(pagination, total) };
}

async function getPublicPackage(packageId) {
  const pkg = await Package.findOne({ _id: packageId, ...(await publicFilter()) }).populate(
    'agencyId',
    PUBLIC_AGENCY_FIELDS,
  );
  if (!pkg) throw ApiError.notFound('This package is not available');
  return publicPackage(pkg);
}

/** Departure cities of currently listed packages, for the browse filter. */
async function listDepartureCities() {
  const cities = await Package.distinct('departureCity', await publicFilter());
  return cities.sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/* Customer: quotation requests                                        */
/* ------------------------------------------------------------------ */

async function requestQuotation(customer, packageId, { seats, message }) {
  const pkg = await Package.findOne({ _id: packageId, ...(await publicFilter()) });
  if (!pkg) throw ApiError.notFound('This package is not available');

  if (seats > pkg.availableSeats) {
    throw ApiError.badRequest(
      pkg.availableSeats === 0
        ? 'This package is fully booked'
        : `Only ${pkg.availableSeats} seat(s) are available on this package`,
      { code: 'NOT_ENOUGH_SEATS', errors: [{ field: 'seats', message: `At most ${pkg.availableSeats}` }] },
    );
  }

  // The partial unique index (one PENDING request per customer and package) enforces this atomically.
  const quotation = await Quotation.create({
    packageId: pkg._id,
    agencyId: pkg.agencyId,
    customerId: customer._id,
    seats,
    message: message || undefined,
    pricePerPerson: pkg.pricePerPerson,
    estimatedTotal: pkg.pricePerPerson * seats,
  }).catch((err) => {
    if (err.code !== 11000) throw err;
    throw ApiError.conflict('You already have a pending request for this package. Wait for the agency to respond.', {
      code: 'QUOTATION_ALREADY_PENDING',
    });
  });

  await audit.record({
    performedBy: customer._id,
    action: AUDIT_ACTIONS.QUOTATION_REQUESTED,
    entityType: ENTITY_TYPES.QUOTATION,
    entityId: quotation._id,
    metadata: { packageId: pkg._id, seats },
  });

  const agency = await Agency.findById(pkg.agencyId);
  if (agency?.email) {
    notification.notify(
      notification.sendEmail(agency.email, 'quotationRequested', {
        businessName: agency.businessName,
        packageTitle: pkg.title,
        customerName: customer.fullName,
        seats,
      }),
    );
  }
  return quotation.toJSON();
}

/** Shapes a quotation for its customer; agency contact details only after confirmation. */
function customerView(q) {
  const json = q.toJSON();
  const pkg = q.packageId;
  json.package = pkg
    ? {
        _id: pkg._id,
        title: pkg.title,
        departureCity: pkg.departureCity,
        departureDate: pkg.departureDate,
        returnDate: pkg.returnDate,
        roomType: pkg.roomType,
      }
    : null;
  const agency = q.agencyId;
  if (agency) {
    json.agency = publicAgency(agency);
    if (q.status === QUOTATION_STATUS.CONFIRMED) {
      json.agency.contact = { phone: agency.phone, whatsapp: agency.whatsapp, email: agency.email, address: agency.address };
    }
  }
  delete json.packageId;
  delete json.agencyId;
  return json;
}

async function listMyQuotations(customer, query) {
  const pagination = getPagination(query);
  const filter = { customerId: customer._id };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Quotation.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('packageId', 'title departureCity departureDate returnDate roomType')
      .populate('agencyId', CONTACT_AGENCY_FIELDS),
    Quotation.countDocuments(filter),
  ]);
  return { items: items.map(customerView), meta: buildMeta(pagination, total) };
}

/** A customer may withdraw a request only while it is still pending. */
async function cancelMyQuotation(customer, quotationId) {
  const quotation = await Quotation.findOneAndUpdate(
    { _id: quotationId, customerId: customer._id, status: QUOTATION_STATUS.PENDING },
    { $set: { status: QUOTATION_STATUS.CANCELLED, cancelledBy: 'CUSTOMER', respondedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!quotation) {
    const exists = await Quotation.exists({ _id: quotationId, customerId: customer._id });
    if (!exists) throw ApiError.notFound('Request not found');
    throw ApiError.conflict('Only pending requests can be withdrawn. Contact the agency about a confirmed booking.', {
      code: 'QUOTATION_NOT_PENDING',
    });
  }
  await audit.record({
    performedBy: customer._id,
    action: AUDIT_ACTIONS.QUOTATION_CANCELLED,
    entityType: ENTITY_TYPES.QUOTATION,
    entityId: quotation._id,
    metadata: { by: 'CUSTOMER' },
  });
  return quotation.toJSON();
}

/* ------------------------------------------------------------------ */
/* Agency: responding to requests                                      */
/* ------------------------------------------------------------------ */

async function listAgencyQuotations(agency, query) {
  const pagination = getPagination(query);
  const filter = { agencyId: agency._id };
  if (query.status) filter.status = query.status;
  if (query.packageId) filter.packageId = query.packageId;

  const [items, total, counts] = await Promise.all([
    Quotation.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('packageId', 'title departureDate returnDate departureCity totalSeats bookedSeats')
      .populate('customerId', CUSTOMER_FIELDS),
    Quotation.countDocuments(filter),
    Quotation.aggregate([{ $match: { agencyId: agency._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const shaped = items.map((q) => {
    const json = q.toJSON();
    json.package = json.packageId;
    json.customer = json.customerId;
    delete json.packageId;
    delete json.customerId;
    return json;
  });
  return {
    items: shaped,
    meta: { ...buildMeta(pagination, total), statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])) },
  };
}

async function findAgencyQuotation(agency, quotationId) {
  const quotation = await Quotation.findOne({ _id: quotationId, agencyId: agency._id });
  if (!quotation) throw ApiError.notFound('Request not found');
  return quotation;
}

/** Moves a quotation out of `from` atomically, so two responses can never both apply. */
async function transition(quotation, from, update) {
  const updated = await Quotation.findOneAndUpdate(
    { _id: quotation._id, status: from },
    { $set: { ...update, respondedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!updated) throw ApiError.conflict('This request has already been handled. Please reload.', { code: 'QUOTATION_STALE' });
  return updated;
}

async function notifyCustomer(quotation, templateName, extra = {}) {
  const [customer, pkg, agency] = await Promise.all([
    User.findById(quotation.customerId),
    Package.findById(quotation.packageId),
    Agency.findById(quotation.agencyId),
  ]);
  if (!customer) return;
  notification.notify(
    notification.sendEmail(customer.email, templateName, {
      name: customer.fullName,
      packageTitle: pkg?.title || 'your Umrah package',
      businessName: agency?.businessName,
      seats: quotation.seats,
      ...extra,
    }),
  );
}

/**
 * Confirms a pending request and reserves its seats. The seat increment is a conditional
 * atomic update, so concurrent confirmations can never exceed the package quota.
 */
async function confirmQuotation(user, agency, quotationId, { note }) {
  const quotation = await findAgencyQuotation(agency, quotationId);
  if (quotation.status !== QUOTATION_STATUS.PENDING) {
    throw ApiError.conflict('Only pending requests can be confirmed', { code: 'QUOTATION_NOT_PENDING' });
  }

  const reserved = await Package.findOneAndUpdate(
    {
      _id: quotation.packageId,
      agencyId: agency._id,
      departureDate: { $gt: new Date() },
      $expr: { $lte: [{ $add: ['$bookedSeats', quotation.seats] }, '$totalSeats'] },
    },
    { $inc: { bookedSeats: quotation.seats } },
    { returnDocument: 'after' },
  );
  if (!reserved) {
    const pkg = await Package.findById(quotation.packageId);
    if (!pkg || pkg.isExpired) {
      throw ApiError.conflict('This package has already departed and can no longer be confirmed', { code: 'PACKAGE_EXPIRED' });
    }
    throw ApiError.conflict(
      `Not enough seats left: ${pkg.availableSeats} available, ${quotation.seats} requested. Increase the quota or decline the request.`,
      { code: 'NOT_ENOUGH_SEATS' },
    );
  }

  let updated;
  try {
    updated = await transition(quotation, QUOTATION_STATUS.PENDING, {
      status: QUOTATION_STATUS.CONFIRMED,
      agencyNote: note || undefined,
    });
  } catch (err) {
    // Someone else handled the request in between: give the seats back.
    await Package.updateOne({ _id: quotation.packageId }, { $inc: { bookedSeats: -quotation.seats } });
    throw err;
  }

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.QUOTATION_CONFIRMED,
    entityType: ENTITY_TYPES.QUOTATION,
    entityId: updated._id,
    metadata: { packageId: quotation.packageId, seats: quotation.seats },
  });
  await notifyCustomer(updated, 'quotationConfirmed', { note });
  return updated.toJSON();
}

async function declineQuotation(user, agency, quotationId, { reason }) {
  const quotation = await findAgencyQuotation(agency, quotationId);
  const updated = await transition(quotation, QUOTATION_STATUS.PENDING, {
    status: QUOTATION_STATUS.DECLINED,
    agencyNote: reason,
  });
  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.QUOTATION_DECLINED,
    entityType: ENTITY_TYPES.QUOTATION,
    entityId: updated._id,
    metadata: { reason },
  });
  await notifyCustomer(updated, 'quotationDeclined', { reason });
  return updated.toJSON();
}

/** Cancels a confirmed booking and releases its seats back to the quota. */
async function cancelConfirmedQuotation(user, agency, quotationId, { reason }) {
  const quotation = await findAgencyQuotation(agency, quotationId);
  const updated = await transition(quotation, QUOTATION_STATUS.CONFIRMED, {
    status: QUOTATION_STATUS.CANCELLED,
    cancelledBy: 'AGENCY',
    agencyNote: reason || quotation.agencyNote,
  });
  await Package.updateOne(
    { _id: quotation.packageId, bookedSeats: { $gte: quotation.seats } },
    { $inc: { bookedSeats: -quotation.seats } },
  );
  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.QUOTATION_CANCELLED,
    entityType: ENTITY_TYPES.QUOTATION,
    entityId: updated._id,
    metadata: { by: 'AGENCY', reason, seatsReleased: quotation.seats },
  });
  await notifyCustomer(updated, 'bookingCancelled', { reason });
  return updated.toJSON();
}

module.exports = {
  listMyPackages,
  getMyPackage,
  createPackage,
  updatePackage,
  setPackageStatus,
  deletePackage,
  browsePackages,
  getPublicPackage,
  listDepartureCities,
  requestQuotation,
  listMyQuotations,
  cancelMyQuotation,
  listAgencyQuotations,
  confirmQuotation,
  declineQuotation,
  cancelConfirmedQuotation,
};
