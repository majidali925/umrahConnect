'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Label, Alert, Spinner } from 'reactstrap';
import { StarInput } from '@/components/common/StarRating';
import { packageService } from '@/services/package.service';
import { getErrorMessage } from '@/utils/errors';

const MAX_COMMENT = 1000;

/**
 * Lets a customer rate the agency of a completed booking, or edit their earlier review.
 * Mounted with a `key` per booking, so its state starts fresh each time it opens.
 * Transitions are off: reactstrap's Fade relies on findDOMNode, which React 19 removed.
 */
export default function ReviewModal({ quotation, onClose, onSaved }) {
  const existing = quotation?.review;
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const handleSave = async () => {
    setTouched(true);
    if (!rating) return;
    setBusy(true);
    setError(null);
    try {
      const res = await packageService.submitReview(quotation._id, { rating, comment: comment.trim() });
      await onSaved(res.message);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const close = busy ? undefined : onClose;
  return (
    <Modal isOpen={Boolean(quotation)} toggle={close} centered fade={false} backdrop={busy ? 'static' : true}>
      <ModalHeader toggle={close}>{existing ? 'Edit your review' : 'Rate your trip'}</ModalHeader>
      <ModalBody>
        {error && (
          <Alert color="danger" fade={false}>
            {error}
          </Alert>
        )}
        <p className="text-secondary mb-3">
          How was your Umrah with <strong className="text-body">{quotation?.agency?.businessName || 'this agency'}</strong>?
          Your review appears on the agency’s public page with your first name and last initial.
        </p>
        <div className="mb-3">
          <Label className="d-block">Your rating</Label>
          <StarInput value={rating} onChange={setRating} invalid={touched && !rating} />
          {touched && !rating && <div className="small text-danger mt-1">Please choose a star rating</div>}
        </div>
        <div>
          <Label for="review-comment">
            Your review <span className="text-secondary fw-normal">(optional)</span>
          </Label>
          <Input
            id="review-comment"
            type="textarea"
            rows={5}
            value={comment}
            maxLength={MAX_COMMENT}
            placeholder="Hotels, transport, visa, how the agency looked after your group…"
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="form-text text-end">
            {comment.length}/{MAX_COMMENT}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleSave} disabled={busy}>
          {busy && <Spinner size="sm" className="me-2" />}
          {existing ? 'Save changes' : 'Submit review'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
