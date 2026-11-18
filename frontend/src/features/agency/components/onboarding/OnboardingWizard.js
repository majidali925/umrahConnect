'use client';

import { useLayoutEffect, useState } from 'react';
import { Button, Card, CardBody, Input, Label, Alert } from 'reactstrap';
import StepIndicator from '@/components/common/StepIndicator';
import FormAlert from '@/components/forms/FormAlert';
import SubmitButton from '@/components/forms/SubmitButton';
import StatusBadge from '@/components/common/StatusBadge';
import DocumentUploader from '../DocumentUploader';
import ApplicationSummary from '../ApplicationSummary';
import { BusinessInfoStep, ContactInfoStep, AddressStep } from './steps';
import { useAgency } from '@/features/agency/AgencyContext';
import { agencyService } from '@/services/agency.service';
import { getErrorMessage } from '@/utils/errors';

const STEPS = ['Business', 'Contact', 'Address', 'Documents', 'Review'];
const STEP_TITLES = ['Business information', 'Contact information', 'Business address', 'Verification documents', 'Review & submit'];
const STEP_FIELDS = {
  1: ['businessName', 'vendorType', 'ownerName', 'description', 'experience'],
  2: ['email', 'phone', 'whatsapp', 'officePhone', 'website'],
  3: ['country', 'province', 'city', 'address', 'postalCode'],
};

function completedSteps(view) {
  const missingFields = new Set(view.missingRequirements.fields.map((f) => f.field));
  const done = [1, 2, 3].filter((s) => STEP_FIELDS[s].every((f) => !missingFields.has(f)) && view.agency[STEP_FIELDS[s][0]]);
  if (!view.missingRequirements.documents.length) done.push(4);
  return done;
}

function firstIncompleteStep(view) {
  const done = completedSteps(view);
  return [1, 2, 3, 4].find((s) => !done.includes(s)) || 5;
}

export default function OnboardingWizard() {
  const { view, reload, setView } = useAgency();
  const [step, setStep] = useState(() => firstIncompleteStep(view));
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Activity keeps this page mounted after navigating away; reset transient state when hidden.
  useLayoutEffect(
    () => () => {
      setSubmitError(null);
      setConfirmed(false);
    },
    [],
  );

  const goTo = (next) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { agency, documentRequirements, missingRequirements, capabilities } = view;
  const isResubmission = agency.verificationStatus === 'REJECTED';

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await agencyService.submit();
      // The page's status gate moves the vendor to the confirmation page once status is PENDING.
      setView(res.data);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StepIndicator steps={STEPS} current={step} completed={completedSteps(view)} onSelect={goTo} />

      {isResubmission && agency.rejectionReason && (
        <Alert color="danger" fade={false}>
          <strong>Changes requested:</strong> {agency.rejectionReason}
        </Alert>
      )}

      <Card>
        <CardBody className="p-4">
          <h2 className="h5 mb-1">{STEP_TITLES[step - 1]}</h2>
          <p className="text-secondary small mb-4">Step {step} of {STEPS.length}</p>

          {step === 1 && <BusinessInfoStep agency={agency} onSaved={() => goTo(2)} />}
          {step === 2 && <ContactInfoStep agency={agency} onSaved={() => goTo(3)} onBack={() => goTo(1)} />}
          {step === 3 && <AddressStep agency={agency} onSaved={() => goTo(4)} onBack={() => goTo(2)} />}

          {step === 4 && (
            <>
              <p className="text-secondary">
                Upload clear copies of the documents below. Each document is reviewed individually by our verification
                team; files are stored privately and only visible to you and authorized reviewers.
              </p>
              {documentRequirements.map((req) => (
                <DocumentUploader key={req.type} requirement={req} canEdit={capabilities.canEdit} onChanged={reload} />
              ))}
              <div className="d-flex justify-content-between gap-2 pt-3 mt-4 border-top">
                <Button color="light" className="border" onClick={() => goTo(3)}>
                  Back
                </Button>
                <Button color="primary" onClick={() => goTo(5)}>
                  Continue to review
                </Button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              {(missingRequirements.fields.length > 0 || missingRequirements.documents.length > 0) && (
                <Alert color="warning" fade={false}>
                  <strong>Please complete the following before submitting:</strong>
                  <ul className="mb-0 mt-2 small">
                    {missingRequirements.fields.map((f) => (
                      <li key={f.field}>{f.message}</li>
                    ))}
                    {missingRequirements.documents.map((d) => (
                      <li key={d.documentType}>{d.message}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold">Application details</span>
                <div className="d-flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <Button key={n} size="sm" color="light" className="border" onClick={() => goTo(n)}>
                      Edit {STEPS[n - 1].toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="border rounded-3 p-3 mb-4">
                <ApplicationSummary agency={agency} />
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold">Documents</span>
                <Button size="sm" color="light" className="border" onClick={() => goTo(4)}>
                  Edit documents
                </Button>
              </div>
              <ul className="list-group mb-4">
                {documentRequirements.map((req) => (
                  <li key={req.type} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                    <span className="min-w-0">
                      {req.label}
                      {!req.required && <span className="text-secondary small"> (optional)</span>}
                      {req.document && <div className="small text-secondary text-truncate">{req.document.originalFileName}</div>}
                    </span>
                    {req.document ? (
                      <StatusBadge type="document" status={req.document.verificationStatus} />
                    ) : (
                      <span className={`badge rounded-pill badge-soft ${req.required ? 'badge-soft-danger' : 'badge-soft-secondary'}`}>
                        Not uploaded
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <FormAlert message={submitError} onDismiss={() => setSubmitError(null)} />

              <div className="form-check mb-3">
                <Input
                  type="checkbox"
                  id="confirm-accuracy"
                  className="form-check-input"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <Label for="confirm-accuracy" className="form-check-label fw-normal">
                  I confirm that the information and documents provided are accurate and that I am authorized to
                  represent this business.
                </Label>
              </div>

              <div className="d-flex justify-content-between gap-2 pt-3 border-top">
                <Button color="light" className="border" onClick={() => goTo(4)} disabled={submitting}>
                  Back
                </Button>
                <SubmitButton
                  type="button"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!capabilities.canSubmit || !confirmed || submitting}
                  loadingText="Submitting…"
                >
                  {isResubmission ? 'Resubmit application' : 'Submit for verification'}
                </SubmitButton>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
