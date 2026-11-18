'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormField from '@/components/forms/FormField';
import PasswordField from '@/components/forms/PasswordField';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import { authService } from '@/services/auth.service';
import { sessionStarted } from '@/features/auth/authSlice';
import { getErrorCode, getErrorMessage, applyServerErrors } from '@/utils/errors';
import { homeRouteFor, safeNextPath } from '@/utils/routes';
import { identifier } from '@/utils/validation';

const schema = Yup.object({
  identifier,
  password: Yup.string().required('Password is required'),
});

export default function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);
  const notice = searchParams.get('reset') ? 'Your password has been reset. Please log in.' : null;

  const handleSubmit = async (values, { setErrors }) => {
    setError(null);
    try {
      const { data } = await authService.login(values);
      dispatch(sessionStarted(data));
      router.replace(safeNextPath(searchParams.get('next')) || homeRouteFor(data.user, data.agency));
    } catch (err) {
      if (getErrorCode(err) === 'ACCOUNT_NOT_VERIFIED') {
        router.push(`/verify-otp?identifier=${encodeURIComponent(values.identifier.trim())}&resend=1`);
        return;
      }
      if (!applyServerErrors(err, setErrors)) setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <h1 className="h3 mb-1">Welcome back</h1>
      <p className="text-secondary mb-4">Log in to your UmrahConnect account.</p>

      <FormAlert message={notice} color="success" />
      <FormAlert message={error} onDismiss={() => setError(null)} />

      <Formik initialValues={{ identifier: '', password: '' }} validationSchema={schema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <FormField
              name="identifier"
              label="Email or mobile number"
              placeholder="you@example.com or 0300 1234567"
              autoComplete="username"
              autoFocus
            />
            <PasswordField name="password" />
            <div className="d-flex justify-content-end mb-3 mt-n2">
              <Link href="/forgot-password" className="small fw-semibold">
                Forgot password?
              </Link>
            </div>
            <SubmitButton loading={isSubmitting} block loadingText="Logging in…">
              Log in
            </SubmitButton>
          </Form>
        )}
      </Formik>

      <hr className="my-4" />
      <p className="text-center small text-secondary mb-1">
        New to UmrahConnect? <Link href="/register" className="fw-semibold">Create an account</Link>
      </p>
      <p className="text-center small text-secondary mb-0">
        Travel agency or operator? <Link href="/register/vendor" className="fw-semibold">Register as a vendor</Link>
      </p>
    </>
  );
}
