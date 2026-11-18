'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Label, FormFeedback, Alert, Spinner } from 'reactstrap';
import { getErrorMessage } from '@/utils/errors';

/**
 * Confirmation dialog with an optional required reason. `onConfirm(reason)` may return a
 * promise; errors are shown inside the dialog. Transitions are disabled because
 * reactstrap's Fade relies on findDOMNode, which React 19 removed.
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = '',
  minReasonLength = 10,
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setReason('');
    setTouched(false);
    setError(null);
    onClose();
  };

  const reasonError =
    requireReason && reason.trim().length < minReasonLength
      ? `Please enter at least ${minReasonLength} characters`
      : null;

  const handleConfirm = async () => {
    setTouched(true);
    if (reasonError) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      close();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={busy ? undefined : close} centered fade={false} backdrop={busy ? 'static' : true}>
      <ModalHeader toggle={busy ? undefined : close}>{title}</ModalHeader>
      <ModalBody>
        {error && (
          <Alert color="danger" fade={false}>
            {error}
          </Alert>
        )}
        {message && <div className="mb-3 text-secondary">{message}</div>}
        {requireReason && (
          <div>
            <Label for="confirm-reason">{reasonLabel}</Label>
            <Input
              id="confirm-reason"
              type="textarea"
              rows={4}
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              invalid={touched && !!reasonError}
              maxLength={1000}
            />
            <FormFeedback>{reasonError}</FormFeedback>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button color={confirmColor} onClick={handleConfirm} disabled={busy}>
          {busy && <Spinner size="sm" className="me-2" />}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
