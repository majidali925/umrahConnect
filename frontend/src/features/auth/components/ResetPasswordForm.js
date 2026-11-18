'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormField from '@/components/forms/FormField';
import PasswordField from '@/components/forms/PasswordField';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import { authService } from '@/services/auth.service';
import { applyServerErrors, getErrorMessage, getErrorCode } from '@/utils/errors';
import { identifier, otp, password, confirmPassword } from '@/utils/validation';

const schema = Yup.object({ identifier, otp, password, confirmPassword });

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);

  const handleSubmit = async (values, { setErrors, setFieldError }) => {
    setError(null);
    try {
      await authService.resetPassword({ ...values, identifier: values.identifier.trim() });
      router.replace('/login?reset=1');
    } catch (err) {
      if (['INVALID_OTP', 'OTP_EXPIRED', 'OTP_LOCKED'].includes(getErrorCode(err))) {
        setFieldError('otp', getErrorMessage(err));
      } else if (!applyServerErrors(err, setErrors)) {
        setError(getErrorMessage(err));
      }
    }
  };

  return (
    <>
      <h1 className="h3 mb-1">Reset your password</h1>
      <p className="text-secondary mb-4">Enter the code from your email and choose a new password.</p>

      <FormAlert message={error} onDismiss={() => setError(null)} />

      <Formik
        initialValues={{ identifier: searchParams.get('identifier') || '', otp: '', password: '', confirmPassword: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form noValidate>
            <FormField name="identifier" label="Email or mobile number" autoComplete="username" />
            <FormField name="otp" label="Reset code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
            <PasswordField name="password" label="New password" autoComplete="new-password" help="8+ characters, letters and numbers" />
            <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" />
            <SubmitButton loading={isSubmitting} block loadingText="Saving…">
              Reset password
            </SubmitButton>
          </Form>
        )}
      </Formik>

      <p className="text-center small text-secondary mt-4 mb-0">
        Didn’t get a code? <Link href="/forgot-password" className="fw-semibold">Send again</Link>
      </p>
    </>
  );
}
