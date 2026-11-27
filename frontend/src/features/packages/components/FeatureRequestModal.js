'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Label, Alert, Spinner, FormText } from 'reactstrap';
import DetailList from '@/components/common/DetailList';
import { LoadingState, ErrorState } from '@/components/common/States';
import { agencyPackageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { UPLOAD } from '@/constants';
import { formatCurrency, formatDateRange, formatPhone } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';

/**
 * The application to feature a package: one fixed offer (7 days), filled in from the agency's
 * profile and the package. The agency can add a note and, to be reviewed first, a screenshot
 * of its payment. `onSent(message)` runs after the application is sent.
 */
export default function FeatureRequestModal({ pkg, onClose, onSent }) {
  const { data, loading, error, reload } = useFetch(() => agencyPackageService.featureApplication(pkg._id), [pkg._id]);
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const chooseFile = (chosen) => {
    setFileError(null);
    if (!chosen) return setFile(null);
    if (!UPLOAD.mimeTypes.includes(chosen.type)) return setFileError('Only PDF, JPG and PNG files are allowed.');
    if (chosen.size > UPLOAD.maxSizeMb * 1024 * 1024) {
      return setFileError(`File is too large. Maximum size is ${UPLOAD.maxSizeMb} MB.`);
    }
    setFile(chosen);
  };

  const submit = async () => {
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await agencyPackageService.requestFeature(pkg._id, { note: note.trim(), paymentProof: file });
      await onSent(res.message);
      onClose();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const app = data?.application;
  const departsSoon = data && data.daysUntilDeparture < data.days;

  return (
    <Modal isOpen toggle={busy ? undefined : onClose} centered fade={false} size="lg" backdrop={busy ? 'static' : true}>
      <ModalHeader toggle={busy ? undefined : onClose}>Apply to feature this package</ModalHeader>
      <ModalBody>
        {loading && !data ? (
          <LoadingState label="Preparing your application…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 mb-3 rounded border bg-light">
              <div>
                <div className="fw-semibold">Featured listing · {data.days} days</div>
                <div className="small text-secondary">
                  Shown at the top of search results with a Featured label, from the day our team approves it.
                </div>
              </div>
              <div className="fs-4 fw-bold text-nowrap">{formatCurrency(data.price)}</div>
            </div>

            {departsSoon && (
              <Alert color="warning" fade={false}>
                This package departs in {data.daysUntilDeparture} day{data.daysUntilDeparture === 1 ? '' : 's'}, so it will
                only be featured until its departure.
              </Alert>
            )}
            {submitError && (
              <Alert color="danger" fade={false}>
                {submitError}
              </Alert>
            )}

            <h3 className="h6 section-title mb-2">Your application</h3>
            <p className="small text-secondary mb-3">
              Filled in from your agency profile and this package. To change these details, edit your profile or the
              package first.
            </p>
            <DetailList
              items={[
                { label: 'Agency', value: app.businessName },
                { label: 'Contact person', value: app.contactName },
                { label: 'Phone', value: formatPhone(app.phone) },
                { label: 'Email', value: app.email },
                { label: 'Package', value: app.packageTitle },
                { label: 'Departure city', value: app.departureCity },
                { label: 'Travel dates', value: formatDateRange(app.departureDate, app.returnDate) },
                { label: 'Price per person', value: formatCurrency(app.pricePerPerson) },
              ]}
            />

            <Label for="feature-note" className="mt-2">
              Note for our team <span className="text-secondary">(optional)</span>
            </Label>
            <Input
              id="feature-note"
              type="textarea"
              rows={2}
              maxLength={1000}
              value={note}
              placeholder="e.g. how and when you paid"
              onChange={(e) => setNote(e.target.value)}
            />

            <Label for="feature-proof" className="mt-3">
              Payment screenshot <span className="text-secondary">(optional)</span>
            </Label>
            <Input
              id="feature-proof"
              type="file"
              accept={UPLOAD.accept}
              invalid={Boolean(fileError)}
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
            {fileError ? (
              <div className="invalid-feedback d-block">{fileError}</div>
            ) : (
              <FormText>
                Want it featured as soon as possible? Attach a screenshot of your {formatCurrency(data.price)} payment and
                your application is reviewed first. PDF, JPG or PNG, up to {UPLOAD.maxSizeMb} MB.
              </FormText>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button color="primary" onClick={submit} disabled={busy || !data || Boolean(fileError)}>
          {busy && <Spinner size="sm" className="me-2" />}
          Send application
        </Button>
      </ModalFooter>
    </Modal>
  );
}
