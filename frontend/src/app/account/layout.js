import { Suspense } from 'react';
import AuthGuard from '@/components/layouts/AuthGuard';
import SiteHeader from '@/components/layouts/SiteHeader';
import SiteFooter from '@/components/layouts/SiteFooter';
import { FullPageLoader } from '@/components/common/States';

export default function AccountLayout({ children }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <SiteHeader />
      <Suspense fallback={<FullPageLoader />}>
        <AuthGuard roles={['CUSTOMER']}>
          <main className="container py-5 flex-grow-1">{children}</main>
        </AuthGuard>
      </Suspense>
      <SiteFooter />
    </div>
  );
}
