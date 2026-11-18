import {
  AGENCY_STATUS_META,
  DOCUMENT_STATUS_META,
  CATEGORY_STATUS_META,
  PACKAGE_STATUS_META,
  QUOTATION_STATUS_META,
} from '@/constants';

const MAPS = {
  agency: AGENCY_STATUS_META,
  document: DOCUMENT_STATUS_META,
  category: CATEGORY_STATUS_META,
  package: PACKAGE_STATUS_META,
  quotation: QUOTATION_STATUS_META,
};

/** Soft-colored status pill for agency, document, verification-category, package and quotation statuses. */
export default function StatusBadge({ status, type = 'agency', className = '' }) {
  const meta = MAPS[type]?.[status] || { label: status, color: 'secondary' };
  return <span className={`badge rounded-pill badge-soft badge-soft-${meta.color} ${className}`}>{meta.label}</span>;
}
