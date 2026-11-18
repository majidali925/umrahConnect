'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAgency } from '@/features/agency/AgencyContext';
import { agencyRouteForStatus } from '@/utils/routes';
import { LoadingState, ErrorState } from '@/components/common/States';

/**
 * Renders children only when the application is in one of `statuses`; otherwise sends the
 * vendor to the page for their actual status. Omit `statuses` to allow any status.
 * `redirects` overrides the destination for specific statuses. Children may be a function
 * receiving the agency view.
 */
export default function AgencyStatusGate({ statuses, redirects = {}, children }) {
  const { view, loading, error, reload } = useAgency();
  const router = useRouter();
  const status = view?.agency?.verificationStatus;
  const allowed = Boolean(view) && (!statuses || statuses.includes(status));

  const target = redirects[status] || agencyRouteForStatus(status);

  useEffect(() => {
    if (view && !allowed) router.replace(target);
  }, [view, allowed, target, router]);

  if (loading && !view) return <LoadingState label="Loading your application…" />;
  if (error && !view) return <ErrorState message={error} onRetry={reload} />;
  if (!allowed) return <LoadingState label="Redirecting…" />;
  return typeof children === 'function' ? children(view) : children;
}
