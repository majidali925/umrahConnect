import { Suspense } from 'react';
import GuestGuard from '@/components/layouts/GuestGuard';
import RegisterForm from '@/features/auth/components/RegisterForm';
import { LoadingState } from '@/components/common/States';

export const metadata = { title: 'Create your account' };

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GuestGuard>
        <RegisterForm role="CUSTOMER" />
      </GuestGuard>
    </Suspense>
  );
}
