'use client';

import PageHeader from '@/components/common/PageHeader';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import OnboardingWizard from '@/features/agency/components/onboarding/OnboardingWizard';

// Leaving the wizard because the application was just submitted shows the confirmation page.
const REDIRECTS = { PENDING: '/agency/submitted' };

export default function OnboardingPage() {
  return (
    <AgencyStatusGate statuses={['DRAFT', 'REJECTED']} redirects={REDIRECTS}>
      {(view) => (
        <>
          <PageHeader
            eyebrow="Vendor onboarding"
            title={view.agency.verificationStatus === 'REJECTED' ? 'Update your application' : 'Complete your application'}
            subtitle="Your progress is saved after each step. Submit when everything is ready for review."
          />
          <OnboardingWizard />
        </>
      )}
    </AgencyStatusGate>
  );
}
