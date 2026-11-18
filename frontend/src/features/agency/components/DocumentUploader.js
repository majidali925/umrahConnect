'use client';

import { useRef, useState } from 'react';
import { Button, Progress } from 'reactstrap';
import StatusBadge from '@/components/common/StatusBadge';
import DocumentViewButton from '@/components/common/DocumentViewButton';
import { agencyService } from '@/services/agency.service';
import { UPLOAD } from '@/constants';
import { formatFileSize, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import styles from './DocumentUploader.module.scss';

/**
 * One document requirement: shows the uploaded file and its review status, and lets the
 * vendor upload, replace or remove it while the application is editable.
 */
export default function DocumentUploader({ requirement, canEdit, onChanged }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(false);
  const { document: doc } = requirement;
  const busy = progress !== null || removing;

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    if (!UPLOAD.mimeTypes.includes(file.type)) {
      setError('Only PDF, JPG and PNG files are allowed.');
      return;
    }
    if (file.size > UPLOAD.maxSizeMb * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${UPLOAD.maxSizeMb} MB.`);
      return;
    }
    setProgress(0);
    try {
      await agencyService.uploadDocument(requirement.type, file, setProgress);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError(null);
    try {
      await agencyService.deleteDocument(doc._id);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={`${styles.item} ${doc?.verificationStatus === 'REJECTED' ? styles.rejected : ''}`}>
      <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
        <div className="min-w-0">
          <div className="fw-semibold">
            {requirement.label}{' '}
            {requirement.required ? (
              <span className="badge rounded-pill badge-soft badge-soft-danger ms-1">Required</span>
            ) : (
              <span className="badge rounded-pill badge-soft badge-soft-secondary ms-1">Optional</span>
            )}
          </div>
          <div className="small text-secondary">{requirement.hint}</div>
        </div>
        {doc && <StatusBadge type="document" status={doc.verificationStatus} className="align-self-start" />}
      </div>

      {doc && (
        <div className={styles.file}>
          <div className={styles.fileIcon} aria-hidden="true">
            {doc.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}
          </div>
          <div className="min-w-0 flex-grow-1">
            <div className="text-truncate fw-medium" title={doc.originalFileName}>
              {doc.originalFileName}
            </div>
            <div className="small text-secondary">
              {formatFileSize(doc.size)} · uploaded {formatDate(doc.createdAt)}
            </div>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <DocumentViewButton load={() => agencyService.getDocumentBlob(doc._id)} onError={setError} />
            {canEdit && (
              <Button size="sm" color="light" className="border" onClick={handleRemove} disabled={busy}>
                {removing ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </div>
        </div>
      )}

      {doc?.verificationStatus === 'REJECTED' && doc.rejectionReason && (
        <div className="small text-danger mt-2">
          <strong>Reviewer note:</strong> {doc.rejectionReason}
        </div>
      )}

      {canEdit && (
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD.accept}
            className="d-none"
            id={`upload-${requirement.type}`}
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={busy}
          />
          {progress !== null ? (
            <div>
              <Progress value={progress} color="primary" className="mb-1" style={{ height: 8 }} />
              <div className="small text-secondary">Uploading… {progress}%</div>
            </div>
          ) : (
            <label htmlFor={`upload-${requirement.type}`} className={`btn btn-sm ${doc ? 'btn-outline-primary' : 'btn-primary'} mb-0`}>
              {doc ? 'Replace file' : 'Choose file'}
            </label>
          )}
          <span className="small text-secondary ms-2">PDF, JPG or PNG · max {UPLOAD.maxSizeMb} MB</span>
        </div>
      )}

      {error && (
        <div className="small text-danger mt-2" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
