'use client';

import Link from 'next/link';
import { Card, CardBody, Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import DocumentUploader from '@/features/agency/components/DocumentUploader';
import { useAgency } from '@/features/agency/AgencyContext';

export default function DocumentsPage() {
  const { reload } = useAgency();
  return (
    <AgencyStatusGate>
      {({ documentRequirements, capabilities, agency }) => (
        <>
          <PageHeader
            eyebrow="Verification"
            title="Verification documents"
            subtitle="Documents are stored privately and visible only to you and UmrahConnect reviewers."
            actions={
              capabilities.canEdit && (
                <Link href="/agency/onboarding" className="btn btn-primary">
                  Continue application
                </Link>
              )
            }
          />
          {!capabilities.canEdit && (
            <Alert color="info" fade={false}>
              Documents are locked while your application is{' '}
              {agency.verificationStatus === 'APPROVED' ? 'approved' : 'being processed'}. Contact support if something
              needs to change.
            </Alert>
          )}
          <Card>
            <CardBody className="p-4">
              {documentRequirements.map((req) => (
                <DocumentUploader key={req.type} requirement={req} canEdit={capabilities.canEdit} onChanged={reload} />
              ))}
            </CardBody>
          </Card>
        </>
      )}
    </AgencyStatusGate>
  );
}
