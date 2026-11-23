'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteFor } from '@/utils/routes';
import { FullPageLoader } from '@/components/common/States';

/**
 * Sends signed-in users to their dashboard. Unlike GuestGuard it never hides the page
 * while the session is being checked, so visitors and search engines get the full
 * server-rendered page; only a confirmed session shows a loader and redirects.
 */
export default function SignedInRedirect() {
  const { status, user, agency } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace(homeRouteFor(user, agency));
  }, [status, user, agency, router]);

  if (status !== 'authenticated') return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#fff' }}>
      <FullPageLoader label="Opening your dashboard…" />
    </div>
  );
}
