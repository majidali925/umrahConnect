'use client';

import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import { LoadingState } from '@/components/common/States';

// The gate redirects to the page for the current status (no status is "allowed" here).
export default function AgencyHomePage() {
  return (
    <AgencyStatusGate statuses={[]}>
      <LoadingState />
    </AgencyStatusGate>
  );
}
