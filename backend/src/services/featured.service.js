const { Agency, FeatureRequest, Package, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const env = require('../config/env');
const audit = require('./audit.service');
const notification = require('./notification.service');
const storage = require('./storage.service');
const {
  AGENCY_STATUS,
  PACKAGE_STATUS,
  FEATURE_REQUEST_STATUS,
  FEATURE_DAYS,
  FEATURE_PRICE,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} = require('../constants');

const DAY_MS = 24 * 60 * 60 * 1000;
const { featureState } = FeatureRequest;

const formatDay = (date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });

/** Whole days left before the package departs (0 when it leaves within a day). */
const daysUntilDeparture = (pkg) => Math.floor((pkg.departureDate - Date.now()) / DAY_MS);

const isListed = (pkg) => pkg.status === PACKAGE_STATUS.PUBLISHED && !pkg.isExpired;

/* ------------------------------------------------------------------ */
/* Agency                                                              */
/* ------------------------------------------------------------------ */

/** What an agency sees about a request on its package list. */
function agencyView(request) {
  if (!request) return null;
  return {
    _id: request._id,
    state: featureState(request),
    days: request.days,
    price: request.price,
    note: request.note || null,
    hasPaymentProof: Boolean(request.hasPaymentProof),
    decisionNote: request.decisionNote || null,
    startsAt: request.startsAt || null,
    endsAt: request.endsAt || null,
    createdAt: request.createdAt,
  };
}

/** The most recent feature request of each package: { [packageId]: view }. */
async function latestRequests(packageIds) {
  const rows = await FeatureRequest.aggregate([
    { $match: { packageId: { $in: packageIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$packageId', request: { $first: '$$ROOT' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), agencyView(r.request)]));
}

/** The agency's package, refused unless it can be featured right now. */
async function featurablePackage(agency, packageId) {
  const pkg = await Package.findOne({ _id: packageId, agencyId: agency._id });
  if (!pkg) throw ApiError.notFound('Package not found');
  if (!isListed(pkg)) {
    throw ApiError.badRequest('Only published packages that have not departed can be featured', {
      code: 'PACKAGE_NOT_LISTED',
    });
  }
  if (pkg.isFeatured) {
    throw ApiError.conflict(
      `This package is already featured until ${formatDay(pkg.featuredUntil)}. You can ask again once it ends.`,
      { code: 'ALREADY_FEATURED' },
    );
  }
  if (daysUntilDeparture(pkg) < 1) {
    throw ApiError.badRequest('This package departs within a day, so it can no longer be featured', {
      code: 'FEATURE_PAST_DEPARTURE',
    });
  }
  const pending = await FeatureRequest.exists({ packageId: pkg._id, status: FEATURE_REQUEST_STATUS.PENDING });
  if (pending) throw pendingConflict();
  return pkg;
}

const pendingConflict = () =>
  ApiError.conflict('This package already has a feature request waiting for approval', {
    code: 'FEATURE_REQUEST_PENDING',
  });

/** The application, filled in from the agency's profile and the package. */
function buildApplication(user, agency, pkg) {
  return {
    businessName: agency.businessName,
    contactName: agency.ownerName || user.fullName,
    phone: agency.phone || user.phone,
    email: agency.email || user.email,
    packageTitle: pkg.title,
    departureCity: pkg.departureCity,
    departureDate: pkg.departureDate,
    returnDate: pkg.returnDate,
    pricePerPerson: pkg.pricePerPerson,
  };
}

/**
 * What the agency sees before sending: the pre-filled application and the fixed offer.
 * `daysUntilDeparture` lets the form warn when the package leaves before the 7 days are up.
 */
async function getApplicationPreview(user, agency, packageId) {
  const pkg = await featurablePackage(agency, packageId);
  return {
    application: buildApplication(user, agency, pkg),
    days: FEATURE_DAYS,
    price: FEATURE_PRICE,
    daysUntilDeparture: daysUntilDeparture(pkg),
  };
}

/** Saves an optional proof of payment privately and returns what the request stores. */
async function savePaymentProof(agency, file) {
  const stored = await storage.saveFile(file.buffer, { folder: `feature-payments/${agency._id}`, mimeType: file.mimetype });
  return {
    storageProvider: stored.provider,
    storageKey: stored.key,
    storageResourceType: stored.resourceType,
    originalFileName: file.originalname.slice(0, 255),
    mimeType: file.mimetype,
    size: file.size,
  };
}

const storedProof = (proof) => ({
  provider: proof.storageProvider,
  key: proof.storageKey,
  resourceType: proof.storageResourceType,
});

/**
 * Sends the application for the fixed offer (FEATURE_DAYS days for FEATURE_PRICE). `file` is an
 * optional proof of payment; requests with one are reviewed first.
 */
async function requestFeature(user, agency, packageId, { note }, file) {
  const pkg = await featurablePackage(agency, packageId);
  const application = buildApplication(user, agency, pkg);
  // Stored only once every check has passed, so a refused request never leaves a file behind.
  const paymentProof = file ? await savePaymentProof(agency, file) : undefined;

  // The partial unique index (one PENDING request per package) also enforces this atomically.
  let request;
  try {
    request = await FeatureRequest.create({
      packageId: pkg._id,
      agencyId: agency._id,
      requestedBy: user._id,
      packageTitle: pkg.title,
      application,
      days: FEATURE_DAYS,
      price: FEATURE_PRICE,
      note: note || undefined,
      paymentProof,
      hasPaymentProof: Boolean(paymentProof),
    });
  } catch (err) {
    if (paymentProof) await storage.deleteFile(storedProof(paymentProof));
    if (err.code === 11000) throw pendingConflict();
    throw err;
  }

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.FEATURE_REQUESTED,
    entityType: ENTITY_TYPES.FEATURE_REQUEST,
    entityId: request._id,
    metadata: {
      packageId: pkg._id,
      agencyId: agency._id,
      days: request.days,
      price: request.price,
      hasPaymentProof: request.hasPaymentProof,
    },
  });

  if (env.adminNotificationEmail) {
    notification.notify(
      notification.sendEmail(env.adminNotificationEmail, 'adminFeatureRequested', {
        businessName: agency.businessName,
        packageTitle: pkg.title,
        days: request.days,
        price: request.price,
        hasPaymentProof: request.hasPaymentProof,
      }),
    );
  }
  return agencyView(request);
}

/** Withdraws the package's request while it is still waiting for an admin. */
async function withdrawFeatureRequest(user, agency, packageId) {
  const request = await FeatureRequest.findOneAndUpdate(
    { packageId, agencyId: agency._id, status: FEATURE_REQUEST_STATUS.PENDING },
    { $set: { status: FEATURE_REQUEST_STATUS.CANCELLED } },
    { returnDocument: 'after' },
  );
  if (!request) throw ApiError.notFound('This package has no feature request waiting for approval');

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.FEATURE_REQUEST_WITHDRAWN,
    entityType: ENTITY_TYPES.FEATURE_REQUEST,
    entityId: request._id,
    metadata: { packageId: request.packageId, agencyId: agency._id },
  });
  return agencyView(request);
}

/** Called when a package is deleted: its pending request can no longer be approved. */
const cancelPendingForPackage = (packageId) =>
  FeatureRequest.updateMany(
    { packageId, status: FEATURE_REQUEST_STATUS.PENDING },
    { $set: { status: FEATURE_REQUEST_STATUS.CANCELLED } },
  );

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/** Mongo filter for a derived state (ACTIVE and ENDED are approved requests split by endsAt). */
function stateFilter(state, now = new Date()) {
  if (state === 'ACTIVE') return { status: FEATURE_REQUEST_STATUS.APPROVED, endsAt: { $gt: now } };
  if (state === 'ENDED') return { status: FEATURE_REQUEST_STATUS.APPROVED, endsAt: { $lte: now } };
  return state ? { status: state } : {};
}

function adminView(request) {
  const json = request.toJSON();
  const pkg = request.packageId;
  json.package =
    pkg && pkg._id
      ? {
          _id: pkg._id,
          title: pkg.title,
          departureCity: pkg.departureCity,
          departureDate: pkg.departureDate,
          status: pkg.status,
          isListed: isListed(pkg),
          isFeatured: pkg.isFeatured,
        }
      : null;
  json.agency = request.agencyId?._id
    ? {
        _id: request.agencyId._id,
        businessName: request.agencyId.businessName,
        city: request.agencyId.city,
        verificationStatus: request.agencyId.verificationStatus,
      }
    : null;
  json.requestedBy = request.requestedBy?._id
    ? { fullName: request.requestedBy.fullName, email: request.requestedBy.email, phone: request.requestedBy.phone }
    : null;
  json.reviewedBy = request.reviewedBy?._id ? { fullName: request.reviewedBy.fullName } : null;
  json.actions = {
    canApprove: json.state === 'PENDING',
    canReject: json.state === 'PENDING',
    canEnd: json.state === 'ACTIVE',
  };
  delete json.packageId;
  delete json.agencyId;
  return json;
}

const populateForAdmin = (query) =>
  query
    .populate('packageId', 'title departureCity departureDate status featuredUntil')
    .populate('agencyId', 'businessName city verificationStatus')
    .populate('requestedBy', 'fullName email phone')
    .populate('reviewedBy', 'fullName');

async function listFeatureRequests(query) {
  const pagination = getPagination(query);
  const now = new Date();
  const filter = stateFilter(query.state, now);
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    const agencyIds = await Agency.find({ businessName: regex }).distinct('_id');
    filter.$or = [{ packageTitle: regex }, { agencyId: { $in: agencyIds } }];
  }

  const [items, total, pending, active] = await Promise.all([
    populateForAdmin(
      FeatureRequest.find(filter)
        // While waiting: requests with proof of payment first, then oldest first (a queue).
        // Otherwise newest first.
        .sort(query.state === 'PENDING' ? { hasPaymentProof: -1, createdAt: 1 } : { createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
    ),
    FeatureRequest.countDocuments(filter),
    FeatureRequest.countDocuments(stateFilter('PENDING')),
    FeatureRequest.countDocuments(stateFilter('ACTIVE', now)),
  ]);
  return {
    items: items.map(adminView),
    meta: { ...buildMeta(pagination, total), stateCounts: { PENDING: pending, ACTIVE: active } },
  };
}

async function findRequest(id) {
  const request = await FeatureRequest.findById(id);
  if (!request) throw ApiError.notFound('Feature request not found');
  return request;
}

const stale = () =>
  ApiError.conflict('This request has already been handled. Please reload.', { code: 'FEATURE_REQUEST_STALE' });

async function getAdminView(id) {
  return adminView(await populateForAdmin(FeatureRequest.findById(id)));
}

const recordAdminAction = (admin, action, request, metadata = {}) =>
  audit.record({
    actorModel: 'Admin',
    performedBy: admin._id,
    action,
    entityType: ENTITY_TYPES.FEATURE_REQUEST,
    entityId: request._id,
    metadata: { packageId: request.packageId, agencyId: request.agencyId, ...metadata },
  });

/** Emails the agency owner about a decision on their request. */
async function notifyAgency(request, template, data = {}) {
  const agency = await Agency.findById(request.agencyId);
  const owner = agency && (await User.findById(agency.userId));
  if (!owner) return;
  notification.notify(
    notification.sendEmail(owner.email, template, {
      name: owner.fullName,
      businessName: agency.businessName,
      packageTitle: request.packageTitle,
      days: request.days,
      ...data,
    }),
  );
}

/** Opens a request's proof of payment for streaming to an admin. */
async function getPaymentProof(id) {
  const request = await findRequest(id);
  if (!request.paymentProof) throw ApiError.notFound('No proof of payment was attached to this request');
  return {
    document: request.paymentProof,
    stream: await storage.openFile(storedProof(request.paymentProof)),
  };
}

/**
 * Approves a pending request: the package is featured from now for the requested days. Refused
 * if the package is no longer listed publicly (unpublished, departed or its agency suspended).
 */
async function approveFeatureRequest(id, admin, { note }) {
  const request = await findRequest(id);
  if (request.status !== FEATURE_REQUEST_STATUS.PENDING) throw stale();

  const [pkg, agency] = await Promise.all([Package.findById(request.packageId), Agency.findById(request.agencyId)]);
  if (!pkg || !isListed(pkg) || agency?.verificationStatus !== AGENCY_STATUS.APPROVED) {
    throw ApiError.conflict("This package is no longer listed publicly, so it can't be featured. Reject the request instead.", {
      code: 'PACKAGE_NOT_LISTED',
    });
  }

  const now = new Date();
  // Never shorten a featured period that is somehow still running: extend it instead.
  const startsAt = pkg.featuredUntil > now ? pkg.featuredUntil : now;
  const endsAt = new Date(startsAt.getTime() + request.days * DAY_MS);
  const updated = await FeatureRequest.findOneAndUpdate(
    { _id: request._id, status: FEATURE_REQUEST_STATUS.PENDING },
    {
      $set: {
        status: FEATURE_REQUEST_STATUS.APPROVED,
        decisionNote: note || undefined,
        reviewedBy: admin._id,
        reviewedAt: now,
        startsAt,
        endsAt,
      },
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw stale();
  await Package.updateOne({ _id: pkg._id }, { $set: { featuredUntil: endsAt } });

  await recordAdminAction(admin, AUDIT_ACTIONS.FEATURE_APPROVED, updated, {
    days: updated.days,
    price: updated.price,
    endsAt,
    ...(note ? { note } : {}),
  });
  await notifyAgency(updated, 'featureApproved', { endsOn: formatDay(endsAt) });
  return getAdminView(updated._id);
}

async function rejectFeatureRequest(id, admin, { reason }) {
  const request = await FeatureRequest.findOneAndUpdate(
    { _id: id, status: FEATURE_REQUEST_STATUS.PENDING },
    {
      $set: {
        status: FEATURE_REQUEST_STATUS.REJECTED,
        decisionNote: reason,
        reviewedBy: admin._id,
        reviewedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );
  if (!request) {
    await findRequest(id);
    throw stale();
  }

  await recordAdminAction(admin, AUDIT_ACTIONS.FEATURE_REJECTED, request, { reason });
  await notifyAgency(request, 'featureRejected', { reason });
  return getAdminView(request._id);
}

/** Stops an active featuring now (e.g. payment fell through). The package returns to its normal place. */
async function endFeaturing(id, admin, { reason }) {
  const now = new Date();
  const request = await FeatureRequest.findOneAndUpdate(
    { _id: id, ...stateFilter('ACTIVE', now) },
    { $set: { endsAt: now, endedEarlyAt: now, decisionNote: reason } },
    { returnDocument: 'after' },
  );
  if (!request) {
    await findRequest(id);
    throw ApiError.conflict('Only an active featuring can be ended', { code: 'FEATURE_NOT_ACTIVE' });
  }
  await Package.updateOne({ _id: request.packageId }, { $unset: { featuredUntil: 1 } });

  await recordAdminAction(admin, AUDIT_ACTIONS.FEATURE_ENDED, request, { reason });
  await notifyAgency(request, 'featureEnded', { reason });
  return getAdminView(request._id);
}

module.exports = {
  getApplicationPreview,
  latestRequests,
  requestFeature,
  withdrawFeatureRequest,
  cancelPendingForPackage,
  listFeatureRequests,
  getPaymentProof,
  approveFeatureRequest,
  rejectFeatureRequest,
  endFeaturing,
};
