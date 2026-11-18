import { Suspense } from 'react';
import GuestGuard from '@/components/layouts/GuestGuard';
import BrandLogo from '@/components/common/BrandLogo';
import { LoadingState } from '@/components/common/States';
import AdminLoginForm from '@/features/auth/components/AdminLoginForm';
import styles from './login.module.scss';

export const metadata = { title: 'Sign in' };

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <BrandLogo href="/login" size="sm" />
          <span className="badge rounded-pill badge-soft badge-soft-dark">Admin</span>
        </div>
        <Suspense fallback={<LoadingState />}>
          <GuestGuard>
            <AdminLoginForm />
          </GuestGuard>
        </Suspense>
      </div>
      <p className="small text-secondary mt-4 mb-0">Restricted area. Sign-ins are recorded.</p>
    </main>
  );
}
