const { Agency, AgencyDocument, User, Admin, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const audit = require('./audit.service');
const notification = require('./notification.service');
const agencyService = require('./agency.service');
const {
  ROLES,
  AGENCY_STATUS,
  DOCUMENT_STATUS,
  DOCUMENT_REQUIREMENTS,
  DOCUMENT_TYPES,
  VENDOR_TYPES,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} = require('../constants');

const USER_SUMMARY = 'fullName email phone role isActive isEmailVerified isPhoneVerified createdAt';
const REVIEWABLE = [AGENCY_STATUS.PENDING, AGENCY_STATUS.UNDER_REVIEW];

const countBy = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
};

async function getDashboard() {
  const [usersByRole, agenciesByStatus, agenciesByType, totalUsers, totalAdmins, recentApplications, recentActivity] =
    await Promise.all([
      countBy(User, 'role'),
      countBy(Agency, 'verificationStatus'),
      countBy(Agency, 'vendorType'),
      User.countDocuments(),
      Admin.countDocuments({ isActive: true }),
      Agency.find({ verificationStatus: { $in: REVIEWABLE } })
        .sort({ submittedAt: 1 })
        .limit(5)
        .select('businessName vendorType verificationStatus city submittedAt'),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).populate('performedBy', 'fullName role'),
    ]);

  const withZeros = (counts, keys) => Object.fromEntries(keys.map((k) => [k, counts[k] || 0]));

  return {
    users: { total: totalUsers, byRole: withZeros(usersByRole, Object.values(ROLES)) },
    admins: { total: totalAdmins },
    agencies: {
      total: Object.values(agenciesByStatus).reduce((a, b) => a + b, 0),
      byStatus: withZeros(agenciesByStatus, Object.values(AGENCY_STATUS)),
      byVendorType: withZeros(agenciesByType, Object.values(VENDOR_TYPES)),
      awaitingReview: (agenciesByStatus.PENDING || 0) + (agenciesByStatus.UNDER_REVIEW || 0),
    },
    recentApplications,
    recentActivity,
  };
}

async function listAgencies(query) {
  const pagination = getPagination(query);
  const filter = {};
  if (query.status) filter.verificationStatus = query.status;
  if (query.vendorType) filter.vendorType = query.vendorType;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ businessName: regex }, { ownerName: regex }, { city: regex }, { email: regex }];
  }

  const [items, total] = await Promise.all([
    Agency.find(filter)
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('userId', 'fullName email phone isActive'),
    Agency.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(pagination, total) };
}

async function findAgency(id) {
  const agency = await Agency.findById(id);
  if (!agency) throw ApiError.notFound('Agency not found');
  return agency;
}

async function getAgencyDetail(id) {
  const agency = await findAgency(id);
  const [user, documents, approvedBy] = await Promise.all([
    User.findById(agency.userId).select(USER_SUMMARY),
    AgencyDocument.find({ agencyId: agency._id })
      .sort({ createdAt: 1 })
      .populate('reviewedBy', 'fullName'),
    agency.approvedBy ? Admin.findById(agency.approvedBy).select('fullName') : null,
  ]);

  const auditLogs = await AuditLog.find({
    $or: [
      { entityType: ENTITY_TYPES.AGENCY, entityId: agency._id },
      { entityType: ENTITY_TYPES.AGENCY_DOCUMENT, 'metadata.agencyId': agency._id },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('performedBy', 'fullName role');

  const view = agencyService.buildAgencyView(agency, documents, user);
  return {
    ...view,
    user,
    approvedBy,
    auditLogs,
    actions: {
      canStartReview: agency.verificationStatus === AGENCY_STATUS.PENDING,
      canApprove: REVIEWABLE.includes(agency.verificationStatus),
      canReject: REVIEWABLE.includes(agency.verificationStatus),
      canSuspend: agency.verificationStatus === AGENCY_STATUS.APPROVED,
      canReinstate: agency.verificationStatus === AGENCY_STATUS.SUSPENDED,
    },
  };
}

function assertStatus(agency, allowed, action) {
  if (!allowed.includes(agency.verificationStatus)) {
    throw ApiError.badRequest(
      `Cannot ${action} an application with status ${agency.verificationStatus}`,
      { code: 'INVALID_STATUS_TRANSITION' },
    );
  }
}

const recordAdminAction = (admin, action, entityType, entityId, metadata) =>
  audit.record({ actorModel: 'Admin', performedBy: admin._id, action, entityType, entityId, metadata });

async function notifyOwner(agency, template, data = {}) {
  const owner = await User.findById(agency.userId);
  if (!owner) return;
  notification.notify(
    notification.sendEmail(owner.email, template, { name: owner.fullName, businessName: agency.businessName, ...data }),
  );
}

/** Every required document must have been individually reviewed and approved. */
async function assertRequiredDocumentsApproved(agency) {
  const documents = await AgencyDocument.find({ agencyId: agency._id, verificationStatus: DOCUMENT_STATUS.APPROVED });
  const unapproved = DOCUMENT_REQUIREMENTS[agency.vendorType].filter(
    (r) => r.required && !documents.some((d) => d.documentType === r.type),
  );
  if (unapproved.length) {
    throw ApiError.badRequest('Approve all required documents before approving the application', {
      code: 'DOCUMENTS_NOT_APPROVED',
      errors: unapproved.map((r) => ({
        field: `documents.${r.type}`,
        message: `${DOCUMENT_TYPES[r.type].label} has not been approved`,
      })),
    });
  }
}

/**
 * Agency status transitions. Each one: allowed source statuses, the fields to set, the audit
 * action, and the email sent to the owner. `reason`/`note` come from the validated request body.
 */
const TRANSITIONS = {
  startReview: {
    from: [AGENCY_STATUS.PENDING],
    verb: 'start review of',
    action: AUDIT_ACTIONS.AGENCY_REVIEW_STARTED,
    set: () => ({ verificationStatus: AGENCY_STATUS.UNDER_REVIEW, reviewStartedAt: new Date() }),
  },
  approve: {
    from: REVIEWABLE,
    verb: 'approve',
    action: AUDIT_ACTIONS.AGENCY_APPROVED,
    check: assertRequiredDocumentsApproved,
    set: (admin) => ({
      verificationStatus: AGENCY_STATUS.APPROVED,
      approvedAt: new Date(),
      approvedBy: admin._id,
      rejectionReason: undefined,
    }),
    metadata: ({ note }) => (note ? { note } : {}),
    email: 'applicationApproved',
  },
  reject: {
    from: REVIEWABLE,
    verb: 'reject',
    action: AUDIT_ACTIONS.AGENCY_REJECTED,
    set: (_admin, { reason }) => ({ verificationStatus: AGENCY_STATUS.REJECTED, rejectionReason: reason }),
    metadata: ({ reason }) => ({ reason }),
    email: 'applicationRejected',
  },
  suspend: {
    from: [AGENCY_STATUS.APPROVED],
    verb: 'suspend',
    action: AUDIT_ACTIONS.AGENCY_SUSPENDED,
    set: (_admin, { reason }) => ({
      verificationStatus: AGENCY_STATUS.SUSPENDED,
      suspensionReason: reason,
      suspendedAt: new Date(),
    }),
    metadata: ({ reason }) => ({ reason }),
    email: 'agencySuspended',
  },
  reinstate: {
    from: [AGENCY_STATUS.SUSPENDED],
    verb: 'reinstate',
    action: AUDIT_ACTIONS.AGENCY_REINSTATED,
    set: () => ({ verificationStatus: AGENCY_STATUS.APPROVED, suspensionReason: undefined, suspendedAt: undefined }),
    email: 'agencyReinstated',
  },
};

async function transitionAgency(name, id, admin, body = {}) {
  const t = TRANSITIONS[name];
  const agency = await findAgency(id);
  assertStatus(agency, t.from, t.verb);
  if (t.check) await t.check(agency);

  agency.set(t.set(admin, body));
  await agency.save();

  const metadata = t.metadata?.(body);
  await recordAdminAction(admin, t.action, ENTITY_TYPES.AGENCY, agency._id, metadata);
  if (t.email) await notifyOwner(agency, t.email, metadata);
  return getAgencyDetail(id);
}

const startReview = (id, admin) => transitionAgency('startReview', id, admin);
const approveAgency = (id, admin, body) => transitionAgency('approve', id, admin, body);
const rejectAgency = (id, admin, body) => transitionAgency('reject', id, admin, body);
const suspendAgency = (id, admin, body) => transitionAgency('suspend', id, admin, body);
const reinstateAgency = (id, admin) => transitionAgency('reinstate', id, admin);

async function reviewDocument(agencyId, documentId, admin, { status, reason }) {
  const agency = await findAgency(agencyId);
  assertStatus(agency, REVIEWABLE, 'review documents of');

  const document = await AgencyDocument.findOne({ _id: documentId, agencyId: agency._id });
  if (!document) throw ApiError.notFound('Document not found');

  document.set({
    verificationStatus: status,
    rejectionReason: status === DOCUMENT_STATUS.REJECTED ? reason : undefined,
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });
  await document.save();

  // Reviewing a document implicitly moves a pending application under review.
  if (agency.verificationStatus === AGENCY_STATUS.PENDING) {
    agency.set(TRANSITIONS.startReview.set());
    await agency.save();
    await recordAdminAction(admin, AUDIT_ACTIONS.AGENCY_REVIEW_STARTED, ENTITY_TYPES.AGENCY, agency._id);
  }

  await recordAdminAction(
    admin,
    status === DOCUMENT_STATUS.APPROVED ? AUDIT_ACTIONS.DOCUMENT_APPROVED : AUDIT_ACTIONS.DOCUMENT_REJECTED,
    ENTITY_TYPES.AGENCY_DOCUMENT,
    document._id,
    { agencyId: agency._id, documentType: document.documentType, reason },
  );

  return getAgencyDetail(agencyId);
}

async function getDocumentFile(agencyId, documentId, admin) {
  const document = await AgencyDocument.findOne({ _id: documentId, agencyId });
  if (!document) throw ApiError.notFound('Document not found');

  await recordAdminAction(admin, AUDIT_ACTIONS.DOCUMENT_VIEWED, ENTITY_TYPES.AGENCY_DOCUMENT, document._id, {
    agencyId: document.agencyId,
    documentType: document.documentType,
  });

  return { document, filePath: agencyService.resolveDocumentPath(document) };
}

async function listUsers(query) {
  const pagination = getPagination(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).select(USER_SUMMARY),
    User.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(pagination, total) };
}

async function listAuditLogs(query) {
  const pagination = getPagination(query);
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('performedBy', 'fullName email role'),
    AuditLog.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(pagination, total) };
}

module.exports = {
  getDashboard,
  listAgencies,
  getAgencyDetail,
  startReview,
  approveAgency,
  rejectAgency,
  suspendAgency,
  reinstateAgency,
  reviewDocument,
  getDocumentFile,
  listUsers,
  listAuditLogs,
};
