'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Button } from 'reactstrap';
import FormField from '@/components/forms/FormField';
import SubmitButton from '@/components/forms/SubmitButton';
import FormAlert from '@/components/forms/FormAlert';
import { authService } from '@/services/auth.service';
import { sessionStarted } from '@/features/auth/authSlice';
import { OTP_PURPOSES, SMS_ENABLED } from '@/constants';
import { getErrorMessage, getErrorCode } from '@/utils/errors';
import { homeRouteFor } from '@/utils/routes';
import { identifier as identifierRule, otp as otpRule } from '@/utils/validation';
import { useCountdown } from '@/hooks/useCountdown';

const RESEND_COOLDOWN_MS = 60_000;

export default function VerifyOtpForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIdentifier = searchParams.get('identifier') || '';
  const sentTo = searchParams.get('sentTo');

  const [purpose, setPurpose] = useState(OTP_PURPOSES.EMAIL_VERIFICATION);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(
    sentTo ? `We sent a 6-digit code to ${sentTo}. It expires in 10 minutes.` : null,
  );
  const [resendAt, setResendAt] = useState(() => (sentTo ? Date.now() + RESEND_COOLDOWN_MS : 0));
  const [resending, setResending] = useState(false);
  const secondsLeft = useCountdown(resendAt);
  const autoResent = useRef(false);

  const resend = async (identifier, nextPurpose = purpose) => {
    if (!identifier) {
      setError('Enter your email or mobile number first.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const { data } = await authService.resendOtp({ identifier, purpose: nextPurpose });
      setPurpose(nextPurpose);
      setInfo(
        data?.destination
          ? `A new code was sent ${data.channel === 'sms' ? 'by SMS ' : ''}to ${data.destination}.`
          : 'If the account exists, a new code has been sent.',
      );
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (err) {
      if (getErrorCode(err) === 'ALREADY_VERIFIED') {
        setInfo('This account is already verified. You can log in now.');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setResending(false);
    }
  };

  // Coming from login with an unverified account: send a fresh code automatically once.
  useEffect(() => {
    if (searchParams.get('resend') && initialIdentifier && !autoResent.current) {
      autoResent.current = true;
      resend(initialIdentifier, OTP_PURPOSES.EMAIL_VERIFICATION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (values, { setFieldError }) => {
    setError(null);
    try {
      const { data } = await authService.verifyOtp({ ...values, purpose });
      if (data.accessToken) {
        dispatch(sessionStarted(data));
        router.replace(homeRouteFor(data.user, data.agency));
      } else {
        router.replace('/login');
      }
    } catch (err) {
      const code = getErrorCode(err);
      if (['INVALID_OTP', 'OTP_EXPIRED', 'OTP_LOCKED'].includes(code)) setFieldError('otp', getErrorMessage(err));
      else setError(getErrorMessage(err));
    }
  };

  const viaSms = purpose === OTP_PURPOSES.PHONE_VERIFICATION;

  return (
    <>
      <h1 className="h3 mb-1">Verify your account</h1>
      <p className="text-secondary mb-4">
        Enter the 6-digit code we sent to your {viaSms ? 'mobile number' : 'email address'}.
      </p>

      <FormAlert message={info} color="success" />
      <FormAlert message={error} onDismiss={() => setError(null)} />

      <Formik
        initialValues={{ identifier: initialIdentifier, otp: '' }}
        validationSchema={Yup.object({ identifier: identifierRule, otp: otpRule })}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values }) => (
          <Form noValidate>
            {!initialIdentifier && <FormField name="identifier" label="Email or mobile number" autoComplete="username" />}
            <FormField
              name="otp"
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              className="mb-3"
              style={{ letterSpacing: '0.6em', fontSize: '1.4rem', textAlign: 'center', fontWeight: 700 }}
              autoFocus={Boolean(initialIdentifier)}
            />
            <SubmitButton loading={isSubmitting} block loadingText="Verifying…">
              Verify and continue
            </SubmitButton>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
              <Button
                color="link"
                className="p-0 small fw-semibold"
                disabled={secondsLeft > 0 || resending}
                onClick={() => resend(values.identifier.trim())}
              >
                {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : resending ? 'Sending…' : 'Resend code'}
              </Button>
              {SMS_ENABLED && (
                <Button
                  color="link"
                  className="p-0 small"
                  disabled={secondsLeft > 0 || resending}
                  onClick={() =>
                    resend(
                      values.identifier.trim(),
                      viaSms ? OTP_PURPOSES.EMAIL_VERIFICATION : OTP_PURPOSES.PHONE_VERIFICATION,
                    )
                  }
                >
                  {viaSms ? 'Use email instead' : 'Verify by SMS instead'}
                </Button>
              )}
            </div>
          </Form>
        )}
      </Formik>

      <p className="text-center small text-secondary mt-4 mb-0">
        <Link href="/login">Back to login</Link>
      </p>
    </>
  );
}
