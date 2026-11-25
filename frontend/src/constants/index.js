export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Marketplace roles only. Platform admins use the separate admin app.
export const ROLES = {
  AGENCY: 'AGENCY',
  CUSTOMER: 'CUSTOMER',
};

export const VENDOR_TYPES = {
  REGISTERED_AGENCY: 'REGISTERED_AGENCY',
  INDEPENDENT_OPERATOR: 'INDEPENDENT_OPERATOR',
};

export const VENDOR_TYPE_OPTIONS = [
  {
    value: VENDOR_TYPES.REGISTERED_AGENCY,
    label: 'Registered Travel Agency',
    description: 'A registered business holding a travel agency license (e.g. DTS).',
  },
  {
    value: VENDOR_TYPES.INDEPENDENT_OPERATOR,
    label: 'Independent Umrah Operator',
    description: 'An individual or small operator organising Umrah groups.',
  },
];

export const VENDOR_TYPE_LABELS = Object.fromEntries(VENDOR_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export const AGENCY_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
};

export const AGENCY_STATUS_META = {
  DRAFT: { label: 'Draft', color: 'secondary' },
  PENDING: { label: 'Pending review', color: 'warning' },
  UNDER_REVIEW: { label: 'Under review', color: 'info' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
  SUSPENDED: { label: 'Suspended', color: 'dark' },
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

// No SMS gateway yet: SMS verification options are hidden across the site. Set to true (together
// with SMS_ENABLED=true in the backend .env) once an SMS provider is connected.
export const SMS_ENABLED = false;

export const OTP_PURPOSES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
};

export const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
];

export const UPLOAD = {
  maxSizeMb: 5,
  accept: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png',
  mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
};

// Public photos: agency header photo and package cover photos.
export const IMAGE_UPLOAD = {
  maxSizeMb: 5,
  accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

/* ---------------- Packages & seat requests ---------------- */

// EXPIRED is derived on the client from package.isExpired, not stored.
export const PACKAGE_STATUS_META = {
  DRAFT: { label: 'Draft', color: 'secondary' },
  PUBLISHED: { label: 'Published', color: 'success' },
  EXPIRED: { label: 'Departed', color: 'dark' },
};

export const ROOM_TYPE_OPTIONS = [
  { value: 'QUAD', label: 'Quad sharing (4 per room)' },
  { value: 'TRIPLE', label: 'Triple sharing (3 per room)' },
  { value: 'DOUBLE', label: 'Double sharing (2 per room)' },
  { value: 'SINGLE', label: 'Single room' },
];
export const ROOM_TYPE_LABELS = Object.fromEntries(ROOM_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export const INCLUSION_OPTIONS = [
  { value: 'VISA', label: 'Umrah visa' },
  { value: 'FLIGHTS', label: 'Return flights' },
  { value: 'HOTEL', label: 'Hotel stay' },
  { value: 'TRANSPORT', label: 'Ground transport' },
  { value: 'ZIYARAT', label: 'Ziyarat tours' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'GUIDE', label: 'Group guide' },
  { value: 'INSURANCE', label: 'Travel insurance' },
];

export const QUOTATION_STATUS_META = {
  PENDING: { label: 'Awaiting agency', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  DECLINED: { label: 'Declined', color: 'danger' },
  CANCELLED: { label: 'Cancelled', color: 'secondary' },
};
