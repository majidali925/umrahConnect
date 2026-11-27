export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/** Marketplace user roles (shown in the Users list). Admins are a separate account type. */
export const USER_ROLE_LABELS = { AGENCY: 'Vendor', CUSTOMER: 'Pilgrim' };

export const VENDOR_TYPE_OPTIONS = [
  {
    value: 'REGISTERED_AGENCY',
    label: 'Registered Travel Agency',
    description: 'A registered business holding a travel agency license (e.g. DTS).',
  },
  {
    value: 'INDEPENDENT_OPERATOR',
    label: 'Independent Umrah Operator',
    description: 'An individual or small operator organising Umrah groups.',
  },
];

export const VENDOR_TYPE_LABELS = Object.fromEntries(VENDOR_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export const AGENCY_STATUS_META = {
  DRAFT: { label: 'Draft', color: 'secondary' },
  PENDING: { label: 'Pending review', color: 'warning' },
  UNDER_REVIEW: { label: 'Under review', color: 'info' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
  SUSPENDED: { label: 'Disabled', color: 'dark' },
};

export const DOCUMENT_STATUS_META = {
  PENDING: { label: 'Awaiting review', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
};

export const VERIFICATION_CATEGORY_LABELS = {
  IDENTITY: 'Identity verification',
  BUSINESS_REGISTRATION: 'Business registration',
  AUTHORIZATION: 'Licensing & authorization',
};

export const CATEGORY_STATUS_META = {
  VERIFIED: { label: 'Verified', color: 'success' },
  PENDING: { label: 'Awaiting review', color: 'warning' },
  REJECTED: { label: 'Rejected', color: 'danger' },
  NOT_PROVIDED: { label: 'Not provided', color: 'secondary' },
};

export const AUDIT_ACTION_LABELS = {
  USER_REGISTERED: 'User registered',
  USER_VERIFIED: 'Account verified',
  PASSWORD_RESET: 'Password reset',
  REFRESH_TOKEN_REUSE: 'Session revoked (token reuse)',
  AGENCY_UPDATED: 'Application updated',
  AGENCY_SUBMITTED: 'Application submitted',
  AGENCY_REVIEW_STARTED: 'Review started',
  AGENCY_APPROVED: 'Application approved',
  AGENCY_REJECTED: 'Application rejected',
  AGENCY_SUSPENDED: 'Vendor disabled',
  AGENCY_REINSTATED: 'Vendor enabled',
  DOCUMENT_UPLOADED: 'Document uploaded',
  DOCUMENT_DELETED: 'Document deleted',
  DOCUMENT_APPROVED: 'Document approved',
  DOCUMENT_REJECTED: 'Document rejected',
  DOCUMENT_VIEWED: 'Document viewed',
  SUPER_ADMIN_SEEDED: 'Super admin created',
  ADMIN_LOGGED_IN: 'Admin signed in',
  PACKAGE_CREATED: 'Package created',
  PACKAGE_UPDATED: 'Package updated',
  PACKAGE_PUBLISHED: 'Package published',
  PACKAGE_UNPUBLISHED: 'Package unpublished',
  PACKAGE_DELETED: 'Package deleted',
  QUOTATION_REQUESTED: 'Seat request sent',
  QUOTATION_CONFIRMED: 'Booking confirmed',
  QUOTATION_DECLINED: 'Seat request declined',
  QUOTATION_CANCELLED: 'Seat request cancelled',
  REVIEW_SUBMITTED: 'Review submitted',
  REVIEW_UPDATED: 'Review updated',
  FEATURE_REQUESTED: 'Feature requested',
  FEATURE_REQUEST_WITHDRAWN: 'Feature request withdrawn',
  FEATURE_APPROVED: 'Featuring approved',
  FEATURE_REJECTED: 'Feature request rejected',
  FEATURE_ENDED: 'Featuring ended early',
};

/** Feature requests: ACTIVE and ENDED are approved requests before and after their end time. */
export const FEATURE_STATE_META = {
  PENDING: { label: 'Awaiting approval', color: 'warning' },
  ACTIVE: { label: 'Featured now', color: 'success' },
  ENDED: { label: 'Ended', color: 'secondary' },
  REJECTED: { label: 'Rejected', color: 'danger' },
  CANCELLED: { label: 'Withdrawn', color: 'dark' },
};
