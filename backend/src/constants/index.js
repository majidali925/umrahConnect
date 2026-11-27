// Roles of marketplace users (the `users` collection).
const ROLES = Object.freeze({
  AGENCY: 'AGENCY',
  CUSTOMER: 'CUSTOMER',
});

// Roles a visitor may pick during public registration.
const PUBLIC_ROLES = [ROLES.CUSTOMER, ROLES.AGENCY];

// Platform administrators live in their own `admins` collection, sign in through
// /admin/auth with separate JWT secrets and cookies, and are never marketplace users.
const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
});

const VENDOR_TYPES = Object.freeze({
  REGISTERED_AGENCY: 'REGISTERED_AGENCY',
  INDEPENDENT_OPERATOR: 'INDEPENDENT_OPERATOR',
});

const VENDOR_TYPE_LABELS = Object.freeze({
  REGISTERED_AGENCY: 'Registered Travel Agency',
  INDEPENDENT_OPERATOR: 'Independent Umrah Operator',
});

const AGENCY_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
});

// Statuses in which the vendor may edit the application and upload documents.
const AGENCY_EDITABLE_STATUSES = [AGENCY_STATUS.DRAFT, AGENCY_STATUS.REJECTED];

const DOCUMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

// What each document proves. Identity, business registration and authorization
// are verified independently so an operator is never implicitly "licensed".
const DOCUMENT_CATEGORIES = Object.freeze({
  IDENTITY: 'IDENTITY',
  BUSINESS_REGISTRATION: 'BUSINESS_REGISTRATION',
  AUTHORIZATION: 'AUTHORIZATION',
});

const DOCUMENT_TYPES = Object.freeze({
  BUSINESS_REGISTRATION: {
    label: 'Business registration document',
    category: DOCUMENT_CATEGORIES.BUSINESS_REGISTRATION,
    hint: 'SECP incorporation certificate, NTN certificate or partnership deed.',
  },
  TRAVEL_AGENCY_LICENSE: {
    label: 'Travel agency registration / license',
    category: DOCUMENT_CATEGORIES.AUTHORIZATION,
    hint: 'Travel agency license issued by the Department of Tourist Services (DTS).',
  },
  UMRAH_AUTHORIZATION: {
    label: 'Umrah authorization',
    category: DOCUMENT_CATEGORIES.AUTHORIZATION,
    hint: 'Ministry of Religious Affairs Umrah enlistment or other applicable authorization.',
  },
  CNIC: {
    label: 'CNIC / identity document',
    category: DOCUMENT_CATEGORIES.IDENTITY,
    hint: 'Front and back of your CNIC in a single PDF, or a clear photo.',
  },
  SUPPORTING_BUSINESS_DOCUMENT: {
    label: 'Supporting business information',
    category: DOCUMENT_CATEGORIES.BUSINESS_REGISTRATION,
    hint: 'NTN certificate, letterhead, utility bill of office, or similar.',
  },
  OTHER_AUTHORIZATION: {
    label: 'Other authorization documents',
    category: DOCUMENT_CATEGORIES.AUTHORIZATION,
    hint: 'Any applicable authorization or affiliation with a licensed agency.',
  },
});

const DOCUMENT_REQUIREMENTS = Object.freeze({
  [VENDOR_TYPES.REGISTERED_AGENCY]: [
    { type: 'BUSINESS_REGISTRATION', required: true },
    { type: 'TRAVEL_AGENCY_LICENSE', required: true },
    { type: 'UMRAH_AUTHORIZATION', required: false },
  ],
  [VENDOR_TYPES.INDEPENDENT_OPERATOR]: [
    { type: 'CNIC', required: true },
    { type: 'SUPPORTING_BUSINESS_DOCUMENT', required: false },
    { type: 'OTHER_AUTHORIZATION', required: false },
  ],
});

const OTP_PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
});

const AUDIT_ACTIONS = Object.freeze({
  USER_REGISTERED: 'USER_REGISTERED',
  USER_VERIFIED: 'USER_VERIFIED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  REFRESH_TOKEN_REUSE: 'REFRESH_TOKEN_REUSE',
  AGENCY_UPDATED: 'AGENCY_UPDATED',
  AGENCY_SUBMITTED: 'AGENCY_SUBMITTED',
  AGENCY_REVIEW_STARTED: 'AGENCY_REVIEW_STARTED',
  AGENCY_APPROVED: 'AGENCY_APPROVED',
  AGENCY_REJECTED: 'AGENCY_REJECTED',
  AGENCY_SUSPENDED: 'AGENCY_SUSPENDED',
  AGENCY_REINSTATED: 'AGENCY_REINSTATED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  DOCUMENT_APPROVED: 'DOCUMENT_APPROVED',
  DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
  DOCUMENT_VIEWED: 'DOCUMENT_VIEWED',
  SUPER_ADMIN_SEEDED: 'SUPER_ADMIN_SEEDED',
  ADMIN_LOGGED_IN: 'ADMIN_LOGGED_IN',
  PACKAGE_CREATED: 'PACKAGE_CREATED',
  PACKAGE_UPDATED: 'PACKAGE_UPDATED',
  PACKAGE_PUBLISHED: 'PACKAGE_PUBLISHED',
  PACKAGE_UNPUBLISHED: 'PACKAGE_UNPUBLISHED',
  PACKAGE_DELETED: 'PACKAGE_DELETED',
  QUOTATION_REQUESTED: 'QUOTATION_REQUESTED',
  QUOTATION_CONFIRMED: 'QUOTATION_CONFIRMED',
  QUOTATION_DECLINED: 'QUOTATION_DECLINED',
  QUOTATION_CANCELLED: 'QUOTATION_CANCELLED',
  REVIEW_SUBMITTED: 'REVIEW_SUBMITTED',
  REVIEW_UPDATED: 'REVIEW_UPDATED',
  FEATURE_REQUESTED: 'FEATURE_REQUESTED',
  FEATURE_REQUEST_WITHDRAWN: 'FEATURE_REQUEST_WITHDRAWN',
  FEATURE_APPROVED: 'FEATURE_APPROVED',
  FEATURE_REJECTED: 'FEATURE_REJECTED',
  FEATURE_ENDED: 'FEATURE_ENDED',
});

const ENTITY_TYPES = Object.freeze({
  USER: 'User',
  ADMIN: 'Admin',
  AGENCY: 'Agency',
  AGENCY_DOCUMENT: 'AgencyDocument',
  PACKAGE: 'Package',
  QUOTATION: 'Quotation',
  REVIEW: 'Review',
  FEATURE_REQUEST: 'FeatureRequest',
});

const PACKAGE_STATUS = Object.freeze({
  DRAFT: 'DRAFT', // visible only to the agency
  PUBLISHED: 'PUBLISHED', // listed publicly while departure is in the future
});

const ROOM_TYPES = Object.freeze({
  QUAD: 'QUAD',
  TRIPLE: 'TRIPLE',
  DOUBLE: 'DOUBLE',
  SINGLE: 'SINGLE',
});

const PACKAGE_INCLUSIONS = Object.freeze({
  VISA: 'VISA',
  FLIGHTS: 'FLIGHTS',
  HOTEL: 'HOTEL',
  TRANSPORT: 'TRANSPORT',
  ZIYARAT: 'ZIYARAT',
  MEALS: 'MEALS',
  GUIDE: 'GUIDE',
  INSURANCE: 'INSURANCE',
});

/**
 * A customer's seat request for a package. There is no payment: only the agency can
 * confirm a request, which reserves the seats against the package quota.
 */
const QUOTATION_STATUS = Object.freeze({
  PENDING: 'PENDING', // awaiting the agency
  CONFIRMED: 'CONFIRMED', // seats reserved by the agency
  DECLINED: 'DECLINED', // agency turned the request down
  CANCELLED: 'CANCELLED', // withdrawn by the customer, or a confirmed booking cancelled by the agency
});

/**
 * An agency's request to feature (pin to the top of search results) one of its packages.
 * Approval by an admin starts the featured period; ACTIVE/ENDED are derived from `endsAt`.
 */
const FEATURE_REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING', // awaiting an admin
  APPROVED: 'APPROVED', // featured from startsAt until endsAt
  REJECTED: 'REJECTED', // turned down by an admin
  CANCELLED: 'CANCELLED', // withdrawn by the agency, or the package was deleted
});

// What an approved request looks like now: ACTIVE while featured, ENDED afterwards.
const FEATURE_REQUEST_STATES = ['PENDING', 'ACTIVE', 'ENDED', 'REJECTED', 'CANCELLED'];

/**
 * Featuring is one fixed offer: FEATURE_DAYS days for FEATURE_PRICE whole PKR. Payment is made
 * outside the app; the agency may attach proof of payment to get its request approved sooner.
 */
const FEATURE_DAYS = 7;
const FEATURE_PRICE = 300;

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
];

const ALLOWED_UPLOAD_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
// Public photos: agency header photos and package cover photos.
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

module.exports = {
  ROLES,
  PUBLIC_ROLES,
  ADMIN_ROLES,
  VENDOR_TYPES,
  VENDOR_TYPE_LABELS,
  AGENCY_STATUS,
  AGENCY_EDITABLE_STATUSES,
  DOCUMENT_STATUS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  DOCUMENT_REQUIREMENTS,
  OTP_PURPOSES,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  PAKISTAN_PROVINCES,
  ALLOWED_UPLOAD_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  PACKAGE_STATUS,
  ROOM_TYPES,
  PACKAGE_INCLUSIONS,
  QUOTATION_STATUS,
  FEATURE_REQUEST_STATUS,
  FEATURE_REQUEST_STATES,
  FEATURE_DAYS,
  FEATURE_PRICE,
};
