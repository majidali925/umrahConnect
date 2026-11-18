'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormField from '@/components/forms/FormField';
import PasswordField from '@/components/forms/PasswordField';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import ChoiceCards from '@/components/forms/ChoiceCards';
import { authService } from '@/services/auth.service';
import { ROLES, VENDOR_TYPE_OPTIONS } from '@/constants';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { email, password, confirmPassword, pakistaniMobile } from '@/utils/validation';
import styles from './RegisterForm.module.scss';

/**
 * Registration for customers (role CUSTOMER) and vendors (role AGENCY with a vendor type).
 * Vendor type is a property of the agency, not a separate login role.
 */
export default function RegisterForm({ role }) {
  const router = useRouter();
  const [error, setError] = useState(null);
  const isVendor = role === ROLES.AGENCY;

  const schema = Yup.object({
    fullName: Yup.string().trim().required('Full name is required').min(2, 'Enter your full name').max(100),
    email,
    phone: pakistaniMobile(),
    password,
    confirmPassword,
    ...(isVendor ? { vendorType: Yup.string().required('Select how you operate') } : {}),
  });

  const initialValues = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    ...(isVendor ? { vendorType: '' } : {}),
  };

  const handleSubmit = async (values, { setErrors }) => {
    setError(null);
    try {
      const { data } = await authService.register({ ...values, role });
      const params = new URLSearchParams({ identifier: values.email.trim(), sentTo: data.verification.destination });
      router.push(`/verify-otp?${params}`);
    } catch (err) {
      if (!applyServerErrors(err, setErrors)) setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className={styles.switcher} role="tablist" aria-label="Account type">
        <Link href="/register" className={!isVendor ? styles.active : ''} role="tab" aria-selected={!isVendor}>
          Pilgrim
        </Link>
        <Link href="/register/vendor" className={isVendor ? styles.active : ''} role="tab" aria-selected={isVendor}>
          Agency / Operator
        </Link>
      </div>

      <h1 className="h3 mb-1">{isVendor ? 'Register your business' : 'Create your account'}</h1>
      <p className="text-secondary mb-4">
        {isVendor
          ? 'Create a vendor account, then complete onboarding for verification.'
          : 'Join UmrahConnect to explore verified Umrah agencies.'}
      </p>

      <FormAlert message={error} onDismiss={() => setError(null)} />

      <Formik initialValues={initialValues} validationSchema={schema} onSubmit={handleSubmit}>
        {({ isSubmitting }) => (
          <Form noValidate>
            {isVendor && <ChoiceCards name="vendorType" label="How do you operate?" options={VENDOR_TYPE_OPTIONS} />}
            <FormField
              name="fullName"
              label={isVendor ? 'Your full name (account owner)' : 'Full name'}
              autoComplete="name"
            />
            <FormField name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
            <FormField
              name="phone"
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              placeholder="0300 1234567"
              help="Pakistani mobile number"
            />
            <div className="row">
              <div className="col-sm-6">
                <PasswordField name="password" autoComplete="new-password" help="8+ characters, letters and numbers" />
              </div>
              <div className="col-sm-6">
                <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" />
              </div>
            </div>
            <SubmitButton loading={isSubmitting} block loadingText="Creating account…">
              Create account
            </SubmitButton>
          </Form>
        )}
      </Formik>

      <p className="text-center small text-secondary mt-4 mb-0">
        Already have an account? <Link href="/login" className="fw-semibold">Log in</Link>
      </p>
    </>
  );
}
