'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormField from '@/components/forms/FormField';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/utils/errors';
import { identifier } from '@/utils/validation';

export default function ForgotPasswordForm() {
  const [sentFor, setSentFor] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (values) => {
    setError(null);
    try {
      const res = await authService.forgotPassword({ identifier: values.identifier.trim() });
      setMessage(res.message);
      setSentFor(values.identifier.trim());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <h1 className="h3 mb-1">Forgot your password?</h1>
      <p className="text-secondary mb-4">
        Enter your email or mobile number and we’ll email you a code to reset your password.
      </p>

      <FormAlert message={error} onDismiss={() => setError(null)} />

      {sentFor ? (
        <>
          <FormAlert message={message} color="success" />
          <Link href={`/reset-password?identifier=${encodeURIComponent(sentFor)}`} className="btn btn-primary w-100">
            Enter reset code
          </Link>
        </>
      ) : (
        <Formik initialValues={{ identifier: '' }} validationSchema={Yup.object({ identifier })} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form noValidate>
              <FormField name="identifier" label="Email or mobile number" autoComplete="username" autoFocus />
              <SubmitButton loading={isSubmitting} block loadingText="Sending…">
                Send reset code
              </SubmitButton>
            </Form>
          )}
        </Formik>
      )}

      <p className="text-center small text-secondary mt-4 mb-0">
        Remembered it? <Link href="/login" className="fw-semibold">Back to login</Link>
      </p>
    </>
  );
}
