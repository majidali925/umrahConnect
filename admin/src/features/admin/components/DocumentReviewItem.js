'use client';

import { useState } from 'react';
import { Button, Spinner } from 'reactstrap';
import StatusBadge from '@/components/common/StatusBadge';
import DocumentViewButton from '@/components/common/DocumentViewButton';
import ConfirmModal from '@/components/common/ConfirmModal';
import { adminService } from '@/services/admin.service';
import { VERIFICATION_CATEGORY_LABELS } from '@/constants';
import { formatDate, formatFileSize } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import styles from '@/app/(panel)/panel.module.scss';

/** One required/optional document with secure viewing and per-document approve/reject. */
export default function DocumentReviewItem({ agencyId, requirement, canReview, onUpdated }) {
  const doc = requirement.document;
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState(null);

  const approve = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await adminService.reviewDocument(agencyId, doc._id, 'APPROVED');
      onUpdated(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApproving(false);
    }
  };

  const reject = async (reason) => {
    const res = await adminService.reviewDocument(agencyId, doc._id, 'REJECTED', reason);
    onUpdated(res.data);
  };

  return (
    <div className={styles.docRow}>
      <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
        <div className="min-w-0">
          <div className="fw-semibold">
            {requirement.label}
            {!requirement.required && <span className="text-secondary small fw-normal"> (optional)</span>}
          </div>
          <div className="small text-secondary">Proves: {VERIFICATION_CATEGORY_LABELS[requirement.category]}</div>
        </div>
        {doc ? (
          <StatusBadge type="document" status={doc.verificationStatus} className="align-self-start" />
        ) : (
          <span className={`badge rounded-pill badge-soft align-self-start ${requirement.required ? 'badge-soft-danger' : 'badge-soft-secondary'}`}>
            Not uploaded
          </span>
        )}
      </div>

      {doc && (
        <>
          <div className="small text-secondary mt-2 text-break">
            {doc.originalFileName} · {formatFileSize(doc.size)} · uploaded {formatDate(doc.createdAt, true)}
          </div>
          {doc.reviewedAt && (
            <div className="small text-secondary">
              Reviewed by {doc.reviewedBy?.fullName || 'admin'} on {formatDate(doc.reviewedAt, true)}
            </div>
          )}
          {doc.verificationStatus === 'REJECTED' && doc.rejectionReason && (
            <div className="small text-danger mt-1">Reason: {doc.rejectionReason}</div>
          )}
          <div className="d-flex flex-wrap gap-2 mt-3">
            <DocumentViewButton load={() => adminService.getDocumentBlob(agencyId, doc._id)} label="View document" onError={setError} />
            {canReview && doc.verificationStatus !== 'APPROVED' && (
              <Button size="sm" color="success" onClick={approve} disabled={approving}>
                {approving ? <Spinner size="sm" /> : 'Approve'}
              </Button>
            )}
            {canReview && doc.verificationStatus !== 'REJECTED' && (
              <Button size="sm" color="danger" outline onClick={() => setRejectOpen(true)} disabled={approving}>
                Reject
              </Button>
            )}
          </div>
        </>
      )}

      {error && <div className="small text-danger mt-2">{error}</div>}

      <ConfirmModal
        isOpen={rejectOpen}
        title={`Reject ${requirement.label.toLowerCase()}`}
        message="The vendor will see this reason and can upload a replacement if the application is sent back."
        confirmLabel="Reject document"
        confirmColor="danger"
        requireReason
        reasonLabel="Reason for rejection"
        reasonPlaceholder="e.g. The document is blurry and the license number is unreadable."
        onConfirm={reject}
        onClose={() => setRejectOpen(false)}
      />
    </div>
  );
}
