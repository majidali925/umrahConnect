import { Suspense } from 'react';
import GuestGuard from '@/components/layouts/GuestGuard';
import RegisterForm from '@/features/auth/components/RegisterForm';
import { LoadingState } from '@/components/common/States';

export const metadata = { title: 'Register as a vendor' };

export default function VendorRegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GuestGuard>
        <RegisterForm role="AGENCY" />
      </GuestGuard>
    </Suspense>
  );
}
