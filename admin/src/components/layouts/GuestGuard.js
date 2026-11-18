'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { safeNextPath } from '@/utils/routes';
import { FullPageLoader } from '@/components/common/States';

/** Sends an already signed-in admin away from the login page. */
export default function GuestGuard({ children }) {
  const { status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'authenticated') router.replace(safeNextPath(searchParams.get('next')) || '/dashboard');
  }, [status, router, searchParams]);

  if (status === 'idle' || status === 'loading') return <FullPageLoader label="Loading…" />;
  if (status === 'authenticated') return <FullPageLoader label="Redirecting…" />;
  return children;
}
