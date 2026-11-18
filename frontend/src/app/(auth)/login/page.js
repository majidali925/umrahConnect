import { Suspense } from 'react';
import GuestGuard from '@/components/layouts/GuestGuard';
import LoginForm from '@/features/auth/components/LoginForm';
import { LoadingState } from '@/components/common/States';

export const metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GuestGuard>
        <LoginForm />
      </GuestGuard>
    </Suspense>
  );
}
