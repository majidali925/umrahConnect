import { AUDIT_ACTION_LABELS } from '@/constants';
import { formatDate } from '@/utils/format';

function describeMeta(log) {
  const meta = log.metadata || {};
  const parts = [];
  if (meta.documentType) parts.push(meta.documentType.replaceAll('_', ' ').toLowerCase());
  if (meta.reason) parts.push(`“${meta.reason}”`);
  if (meta.note) parts.push(`Note: ${meta.note}`);
  if (meta.isResubmission) parts.push('resubmission');
  if (meta.fields?.length) parts.push(`fields: ${meta.fields.join(', ')}`);
  if (meta.role) parts.push(meta.role.toLowerCase());
  if (meta.cancelledRequests) {
    parts.push(`${meta.cancelledRequests} pending seat request${meta.cancelledRequests === 1 ? '' : 's'} cancelled`);
  }
  return parts.join(' · ');
}

/** Compact activity feed for audit log entries. */
export default function AuditLogList({ logs, showEntity = false }) {
  return (
    <ul className="list-unstyled mb-0">
      {logs.map((log) => (
        <li key={log._id} className="py-2 border-bottom d-flex gap-3">
          <span className="flex-shrink-0 mt-2 rounded-circle bg-primary" style={{ width: 8, height: 8 }} aria-hidden="true" />
          <div className="min-w-0 flex-grow-1">
            <div className="d-flex flex-wrap justify-content-between gap-1">
              <span className="fw-semibold small">{AUDIT_ACTION_LABELS[log.action] || log.action}</span>
              <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                {formatDate(log.createdAt, true)}
              </span>
            </div>
            <div className="small text-secondary text-break">
              {log.performedBy ? `${log.performedBy.fullName} (${log.performedBy.role?.replace('_', ' ').toLowerCase()})` : 'System'}
              {showEntity && ` · ${log.entityType}`}
              {describeMeta(log) && ` · ${describeMeta(log)}`}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
