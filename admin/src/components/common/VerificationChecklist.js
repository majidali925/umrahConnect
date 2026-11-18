import StatusBadge from './StatusBadge';
import { VERIFICATION_CATEGORY_LABELS } from '@/constants';

/**
 * Shows identity, business registration and authorization verification separately,
 * and only labels a vendor "licensed" when the server says so.
 */
export default function VerificationChecklist({ summary }) {
  if (!summary) return null;
  return (
    <div>
      <ul className="list-unstyled mb-3">
        {summary.categories
          .filter((c) => c.applicable)
          .map((c) => (
            <li key={c.category} className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <span>
                {VERIFICATION_CATEGORY_LABELS[c.category]}
                {!c.required && <span className="text-secondary small ms-1">(optional)</span>}
              </span>
              <StatusBadge type="category" status={c.status} />
            </li>
          ))}
      </ul>
      <div className="d-flex flex-wrap gap-2">
        <span className="badge rounded-pill badge-soft badge-soft-primary">{summary.vendorTypeLabel}</span>
        {summary.isLicensedAgency && (
          <span className="badge rounded-pill badge-soft badge-soft-success">Licensed travel agency</span>
        )}
        {summary.hasUmrahAuthorization && (
          <span className="badge rounded-pill badge-soft badge-soft-success">Umrah authorization verified</span>
        )}
      </div>
    </div>
  );
}
