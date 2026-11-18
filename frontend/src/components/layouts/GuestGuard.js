'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteFor, safeNextPath } from '@/utils/routes';
import { FullPageLoader } from '@/components/common/States';

/** Redirects already signed-in users away from login/registration pages. */
export default function GuestGuard({ children }) {
  const { status, user, agency } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(safeNextPath(searchParams.get('next')) || homeRouteFor(user, agency));
    }
  }, [status, user, agency, router, searchParams]);

  if (status === 'idle' || status === 'loading') return <FullPageLoader label="Loading…" />;
  if (status === 'authenticated') return <FullPageLoader label="Redirecting…" />;
  return children;
}
