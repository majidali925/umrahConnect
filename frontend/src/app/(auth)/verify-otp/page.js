import { Suspense } from 'react';
import VerifyOtpForm from '@/features/auth/components/VerifyOtpForm';
import { LoadingState } from '@/components/common/States';

export const metadata = { title: 'Verify your account' };

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyOtpForm />
    </Suspense>
  );
}
