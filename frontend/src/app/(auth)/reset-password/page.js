import { Suspense } from 'react';
import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm';
import { LoadingState } from '@/components/common/States';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
