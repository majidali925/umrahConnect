'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FullPageLoader } from '@/components/common/States';

/**
 * Client-side guard for the admin panel. It only decides what to *render*; every API call
 * is still authorized by the backend with the admin token.
 */
export default function AdminGuard({ children }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== 'authenticated') return <FullPageLoader label="Checking your session…" />;
  return children;
}
