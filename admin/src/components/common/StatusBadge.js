import { AGENCY_STATUS_META, DOCUMENT_STATUS_META, CATEGORY_STATUS_META } from '@/constants';

const MAPS = {
  agency: AGENCY_STATUS_META,
  document: DOCUMENT_STATUS_META,
  category: CATEGORY_STATUS_META,
};

/** Soft-colored status pill for agency, document and verification-category statuses. */
export default function StatusBadge({ status, type = 'agency', className = '' }) {
  const meta = MAPS[type]?.[status] || { label: status, color: 'secondary' };
  return <span className={`badge rounded-pill badge-soft badge-soft-${meta.color} ${className}`}>{meta.label}</span>;
}
