'use client';

import { useState } from 'react';
import { Formik, Form } from 'formik';
import { Button } from 'reactstrap';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import { agencyService } from '@/services/agency.service';
import { useAgency } from '@/features/agency/AgencyContext';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';

/**
 * Shared wrapper for data-entry steps: validates with Yup, saves the step to the API as a
 * draft, refreshes the shared application state, then advances.
 */
export default function StepForm({ initialValues, validationSchema, toPayload = (v) => v, onBack, onSaved, children }) {
  const { setView } = useAgency();
  const [error, setError] = useState(null);

  const handleSubmit = async (values, { setErrors }) => {
    setError(null);
    try {
      const res = await agencyService.updateMine(toPayload(validationSchema.cast(values, { stripUnknown: true })));
      setView(res.data);
      onSaved();
    } catch (err) {
      if (!applyServerErrors(err, setErrors)) setError(getErrorMessage(err));
    }
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
      {(formik) => (
        <Form noValidate>
          <FormAlert message={error} onDismiss={() => setError(null)} />
          {typeof children === 'function' ? children(formik) : children}
          <div className="d-flex justify-content-between gap-2 pt-3 mt-2 border-top">
            {onBack ? (
              <Button type="button" color="light" className="border" onClick={onBack} disabled={formik.isSubmitting}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <SubmitButton loading={formik.isSubmitting} loadingText="Saving…">
              Save & continue
            </SubmitButton>
          </div>
        </Form>
      )}
    </Formik>
  );
}
