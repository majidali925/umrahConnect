'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormField from '@/components/forms/FormField';
import PasswordField from '@/components/forms/PasswordField';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import { adminAuthService } from '@/services/adminAuth.service';
import { sessionStarted } from '@/features/auth/authSlice';
import { getErrorMessage, applyServerErrors } from '@/utils/errors';
import { safeNextPath } from '@/utils/routes';

const schema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export default function AdminLoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);

  const handleSubmit = async (values, { setErrors }) => {
    setError(null);
    try {
      const { data } = await adminAuthService.login({ email: values.email.trim(), password: values.password });
      dispatch(sessionStarted(data));
      router.replace(safeNextPath(searchParams.get('next')) || '/dashboard');
    } catch (err) {
      if (!applyServerErrors(err, setErrors)) setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <h1 className="h4 mb-1">Admin sign in</h1>
      <p className="text-secondary small mb-4">For UmrahConnect platform administrators only.</p>

      <FormAlert message={error} onDismiss={() => setError(null)} />

      <Formik initialValues={{ email: '', password: '' }} validationSchema={schema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            <FormField name="email" type="email" label="Email" placeholder="admin@example.com" autoComplete="username" autoFocus />
            <PasswordField name="password" />
            <SubmitButton loading={isSubmitting} block loadingText="Signing in…">
              Sign in
            </SubmitButton>
          </Form>
        )}
      </Formik>
    </>
  );
}
