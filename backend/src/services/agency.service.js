const fs = require('fs');
const path = require('path');
const { Agency, AgencyDocument } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const audit = require('./audit.service');
const notification = require('./notification.service');
const { submission: submissionSchema } = require('../validators/agency.validator');
const {
  AGENCY_STATUS,
  AGENCY_EDITABLE_STATUSES,
  DOCUMENT_TYPES,
  DOCUMENT_REQUIREMENTS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUS,
  VENDOR_TYPES,
  VENDOR_TYPE_LABELS,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} = require('../constants');

const SUBMISSION_FIELDS = Object.keys(submissionSchema.describe().keys);

/* ------------------------------------------------------------------ */
/* Derived views shared by vendor and admin endpoints                  */
/* ------------------------------------------------------------------ */

function documentRequirements(vendorType, documents) {
  return DOCUMENT_REQUIREMENTS[vendorType].map(({ type, required }) => ({
    type,
    required,
    ...DOCUMENT_TYPES[type],
    document: documents.find((d) => d.documentType === type) || null,
  }));
}

/**
 * Summarizes verification per category. Identity, business registration and authorization
 * are reported separately; "licensed agency" is only true for a registered agency whose
 * travel agency license has been explicitly approved by an admin.
 */
function verificationSummary(agency, documents) {
  const requirements = DOCUMENT_REQUIREMENTS[agency.vendorType];
  const relevantTypes = requirements.map((r) => r.type);
  const relevant = documents.filter((d) => relevantTypes.includes(d.documentType));
  const isApproved = (type) =>
    relevant.some((d) => d.documentType === type && d.verificationStatus === DOCUMENT_STATUS.APPROVED);

  const categories = Object.values(DOCUMENT_CATEGORIES).map((category) => {
    const docs = relevant.filter((d) => d.category === category);
    const required = requirements.some((r) => r.required && DOCUMENT_TYPES[r.type].category === category);
    const applicable = requirements.some((r) => DOCUMENT_TYPES[r.type].category === category);
    let status = 'NOT_PROVIDED';
    if (docs.some((d) => d.verificationStatus === DOCUMENT_STATUS.APPROVED)) status = 'VERIFIED';
    else if (docs.some((d) => d.verificationStatus === DOCUMENT_STATUS.PENDING)) status = 'PENDING';
    else if (docs.length) status = 'REJECTED';
    return { category, required, applicable, status };
  });

  return {
    vendorTypeLabel: VENDOR_TYPE_LABELS[agency.vendorType],
    categories,
    isLicensedAgency: agency.vendorType === VENDOR_TYPES.REGISTERED_AGENCY && isApproved('TRAVEL_AGENCY_LICENSE'),
    hasUmrahAuthorization: isApproved('UMRAH_AUTHORIZATION'),
  };
}

/** Lists what still prevents submission: invalid/missing fields and required documents. */
function missingRequirements(agency, documents) {
  const values = {};
  for (const field of SUBMISSION_FIELDS) {
    if (agency[field] !== undefined && agency[field] !== null) values[field] = agency[field];
  }
  const { error } = submissionSchema.validate(values, { abortEarly: false, stripUnknown: true });
  const fields = (error?.details || []).map((d) => ({
    field: d.path.join('.'),
    message: d.message.replace(/["]/g, ''),
  }));

  const docs = documentRequirements(agency.vendorType, documents)
    .filter((r) => r.required)
    .filter((r) => !r.document || r.document.verificationStatus === DOCUMENT_STATUS.REJECTED)
    .map((r) => ({
      documentType: r.type,
      message: r.document ? `${r.label} was rejected — please upload a new file` : `${r.label} is required`,
    }));

  return { fields, documents: docs };
}

function buildAgencyView(agency, documents, user) {
  const docs = documents.map((d) => (typeof d.toJSON === 'function' ? d.toJSON() : d));
  const missing = missingRequirements(agency, docs);
  const canEdit = AGENCY_EDITABLE_STATUSES.includes(agency.verificationStatus);
  return {
    agency: agency.toJSON(),
    documents: docs,
    documentRequirements: documentRequirements(agency.vendorType, docs),
    verificationSummary: verificationSummary(agency, docs),
    missingRequirements: missing,
    capabilities: {
      canEdit,
      canSubmit: canEdit && !missing.fields.length && !missing.documents.length,
      canPublish: agency.verificationStatus === AGENCY_STATUS.APPROVED && (user ? user.isActive : true),
    },
  };
}

function resolveDocumentPath(document) {
  const root = path.resolve(env.uploads.dir);
  const filePath = path.resolve(root, document.documentUrl);
  // Defense in depth: never serve anything outside the uploads directory.
  if (!filePath.startsWith(root + path.sep)) throw ApiError.notFound('Document not found');
  return filePath;
}

async function removeFile(relativePath) {
  try {
    await fs.promises.unlink(resolveDocumentPath({ documentUrl: relativePath }));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[uploads] Could not delete ${relativePath}: ${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Vendor operations                                                   */
/* ------------------------------------------------------------------ */

async function getAgencyByUserId(userId) {
  const agency = await Agency.findOne({ userId });
  if (!agency) throw ApiError.notFound('No vendor profile found for this account', { code: 'AGENCY_NOT_FOUND' });
  return agency;
}

function assertEditable(agency) {
  if (!AGENCY_EDITABLE_STATUSES.includes(agency.verificationStatus)) {
    throw ApiError.forbidden(
      `Your application cannot be edited while its status is ${agency.verificationStatus.replace('_', ' ').toLowerCase()}`,
      { code: 'AGENCY_NOT_EDITABLE' },
    );
  }
}

async function getMyAgency(user) {
  const agency = await getAgencyByUserId(user._id);
  const documents = await AgencyDocument.find({ agencyId: agency._id }).sort({ createdAt: 1 });
  return buildAgencyView(agency, documents, user);
}

async function updateMyAgency(user, data) {
  const agency = await getAgencyByUserId(user._id);
  assertEditable(agency);

  agency.set(data);
  const changedFields = agency.modifiedPaths();
  await agency.save();

  if (changedFields.length && agency.verificationStatus !== AGENCY_STATUS.DRAFT) {
    await audit.record({
      performedBy: user._id,
      action: AUDIT_ACTIONS.AGENCY_UPDATED,
      entityType: ENTITY_TYPES.AGENCY,
      entityId: agency._id,
      metadata: { fields: changedFields },
    });
  }
  return getMyAgency(user);
}

/** Stores an uploaded document, replacing any existing document of the same type. */
async function addDocument(user, agency, file, documentType) {
  const relativePath = path.relative(env.uploads.dir, file.path);

  // On any error below, the uploaded file is removed by cleanupUploadOnError.
  if (!DOCUMENT_REQUIREMENTS[agency.vendorType].some((r) => r.type === documentType)) {
    throw ApiError.badRequest(
      `${DOCUMENT_TYPES[documentType].label} is not applicable to ${VENDOR_TYPE_LABELS[agency.vendorType]}s`,
      { code: 'INVALID_DOCUMENT_TYPE' },
    );
  }

  const previous = await AgencyDocument.find({ agencyId: agency._id, documentType });

  const document = await AgencyDocument.create({
    agencyId: agency._id,
    documentType,
    category: DOCUMENT_TYPES[documentType].category,
    documentUrl: relativePath,
    originalFileName: path.basename(file.originalname).slice(0, 255),
    mimeType: file.mimetype,
    size: file.size,
  });

  for (const old of previous) {
    await removeFile(old.documentUrl);
    await old.deleteOne();
  }

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    entityType: ENTITY_TYPES.AGENCY_DOCUMENT,
    entityId: document._id,
    metadata: { agencyId: agency._id, documentType, replaced: previous.length > 0 },
  });

  return document.toJSON();
}

async function deleteDocument(user, documentId) {
  const agency = await getAgencyByUserId(user._id);
  assertEditable(agency);

  const document = await AgencyDocument.findOne({ _id: documentId, agencyId: agency._id });
  if (!document) throw ApiError.notFound('Document not found');

  await removeFile(document.documentUrl);
  await document.deleteOne();

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.DOCUMENT_DELETED,
    entityType: ENTITY_TYPES.AGENCY_DOCUMENT,
    entityId: document._id,
    metadata: { agencyId: agency._id, documentType: document.documentType },
  });
}

/** Returns a vendor's own document for streaming. Resource-level check: agencyId must match. */
async function getMyDocumentFile(user, documentId) {
  const agency = await getAgencyByUserId(user._id);
  const document = await AgencyDocument.findOne({ _id: documentId, agencyId: agency._id });
  if (!document) throw ApiError.notFound('Document not found');
  return { document, filePath: resolveDocumentPath(document) };
}

async function submitApplication(user) {
  const agency = await getAgencyByUserId(user._id);
  assertEditable(agency);

  const documents = await AgencyDocument.find({ agencyId: agency._id });
  const missing = missingRequirements(agency, documents);
  if (missing.fields.length || missing.documents.length) {
    throw ApiError.badRequest('Your application is incomplete', {
      code: 'APPLICATION_INCOMPLETE',
      errors: [
        ...missing.fields,
        ...missing.documents.map((d) => ({ field: `documents.${d.documentType}`, message: d.message })),
      ],
    });
  }

  const isResubmission = agency.verificationStatus === AGENCY_STATUS.REJECTED;
  agency.verificationStatus = AGENCY_STATUS.PENDING;
  agency.submittedAt = new Date();
  agency.rejectionReason = undefined;
  agency.reviewStartedAt = undefined;
  await agency.save();

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.AGENCY_SUBMITTED,
    entityType: ENTITY_TYPES.AGENCY,
    entityId: agency._id,
    metadata: { isResubmission, vendorType: agency.vendorType },
  });

  notification.notify(
    notification.sendEmail(user.email, 'applicationSubmitted', {
      name: user.fullName,
      businessName: agency.businessName,
    }),
  );
  if (env.adminNotificationEmail) {
    notification.notify(
      notification.sendEmail(env.adminNotificationEmail, 'adminNewApplication', {
        businessName: agency.businessName,
        vendorTypeLabel: VENDOR_TYPE_LABELS[agency.vendorType],
        agencyId: agency._id.toString(),
        isResubmission,
      }),
    );
  }

  return getMyAgency(user);
}

async function getVerificationStatus(user) {
  const agency = await getAgencyByUserId(user._id);
  const documents = await AgencyDocument.find({ agencyId: agency._id });
  const docs = documents.map((d) => d.toJSON());
  return {
    agencyId: agency._id,
    businessName: agency.businessName || null,
    vendorType: agency.vendorType,
    verificationStatus: agency.verificationStatus,
    rejectionReason: agency.rejectionReason || null,
    suspensionReason: agency.suspensionReason || null,
    submittedAt: agency.submittedAt || null,
    approvedAt: agency.approvedAt || null,
    suspendedAt: agency.suspendedAt || null,
    verificationSummary: verificationSummary(agency, docs),
    documents: docs.map(({ _id, documentType, verificationStatus, rejectionReason }) => ({
      _id,
      documentType,
      label: DOCUMENT_TYPES[documentType].label,
      verificationStatus,
      rejectionReason: rejectionReason || null,
    })),
    canPublish: agency.verificationStatus === AGENCY_STATUS.APPROVED && user.isActive,
  };
}

module.exports = {
  buildAgencyView,
  resolveDocumentPath,
  getAgencyByUserId,
  assertEditable,
  getMyAgency,
  updateMyAgency,
  addDocument,
  deleteDocument,
  getMyDocumentFile,
  submitApplication,
  getVerificationStatus,
};
