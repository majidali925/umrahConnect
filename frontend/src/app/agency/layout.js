'use client';

import { Suspense } from 'react';
import AuthGuard from '@/components/layouts/AuthGuard';
import DashboardShell from '@/components/layouts/DashboardShell';
import { AgencyProvider } from '@/features/agency/AgencyContext';
import { FullPageLoader } from '@/components/common/States';
import { useAuth } from '@/hooks/useAuth';
import { AGENCY_STATUS } from '@/constants';

const APPLICATION_PATHS = ['/agency/onboarding', '/agency/submitted', '/agency/pending-approval', '/agency/rejected', '/agency/suspended'];

const BASE_NAV = [
  { href: '/agency', label: 'My application', match: (p) => p === '/agency' || APPLICATION_PATHS.some((a) => p.startsWith(a)) },
  { href: '/agency/documents', label: 'Documents' },
  { href: '/agency/profile', label: 'Agency profile' },
];

// Publishing tools appear only for approved vendors; the API enforces this independently.
const APPROVED_NAV = [
  { href: '/agency/packages', label: 'Packages' },
  { href: '/agency/quotations', label: 'Seat requests' },
];

export default function AgencyLayout({ children }) {
  const { agency } = useAuth();
  const nav = agency?.verificationStatus === AGENCY_STATUS.APPROVED ? [...BASE_NAV, ...APPROVED_NAV] : BASE_NAV;

  return (
    <Suspense fallback={<FullPageLoader />}>
      <AuthGuard roles={['AGENCY']}>
        <AgencyProvider>
          <DashboardShell navItems={nav} areaLabel="Vendor portal">
            {children}
          </DashboardShell>
        </AgencyProvider>
      </AuthGuard>
    </Suspense>
  );
}
