'use client';

import { Suspense } from 'react';
import AdminGuard from '@/components/layouts/AdminGuard';
import DashboardShell from '@/components/layouts/DashboardShell';
import { FullPageLoader } from '@/components/common/States';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agencies', label: 'Agencies & operators' },
  { href: '/featured', label: 'Featured requests' },
  { href: '/users', label: 'Users' },
  { href: '/audit-logs', label: 'Audit logs' },
];

export default function PanelLayout({ children }) {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <AdminGuard>
        <DashboardShell navItems={NAV} areaLabel="Admin panel">
          {children}
        </DashboardShell>
      </AdminGuard>
    </Suspense>
  );
}
