'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteFor } from '@/utils/routes';
import { FullPageLoader } from '@/components/common/States';

/**
 * Client-side route guard for protected layouts. It only decides what to *render*;
 * every API call is still authorized by the backend, which is the source of truth.
 */
export default function AuthGuard({ roles, children }) {
  const { status, user, agency } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = status === 'authenticated' && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === 'authenticated' && !allowed) {
      router.replace(homeRouteFor(user, agency));
    }
  }, [status, allowed, user, agency, router, pathname]);

  if (!allowed) return <FullPageLoader label={status === 'authenticated' ? 'Redirecting…' : 'Checking your session…'} />;
  return children;
}
