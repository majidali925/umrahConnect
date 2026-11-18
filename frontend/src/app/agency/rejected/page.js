'use client';

import Link from 'next/link';
import { Card, CardBody, Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';

export default function RejectedPage() {
  return (
    <AgencyStatusGate statuses={['REJECTED']}>
      {({ agency, documentRequirements }) => {
        const rejectedDocs = documentRequirements.filter((r) => r.document?.verificationStatus === 'REJECTED');
        return (
          <>
            <PageHeader
              eyebrow="Application status"
              title="Your application needs changes"
              subtitle="Review the feedback below, update your application and resubmit it."
              actions={<StatusBadge status="REJECTED" className="fs-6" />}
            />
            <Alert color="danger" fade={false} className="mb-4">
              <div className="fw-semibold mb-1">Reason from our verification team</div>
              <div style={{ whiteSpace: 'pre-line' }}>{agency.rejectionReason}</div>
            </Alert>

            {rejectedDocs.length > 0 && (
              <Card className="mb-4">
                <CardBody className="p-4">
                  <h2 className="h6 section-title mb-3">Documents to replace</h2>
                  <ul className="list-unstyled mb-0">
                    {rejectedDocs.map((r) => (
                      <li key={r.type} className="py-2 border-bottom">
                        <div className="fw-semibold">{r.label}</div>
                        {r.document.rejectionReason && (
                          <div className="small text-danger">{r.document.rejectionReason}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody className="p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div>
                  <div className="fw-semibold">Ready to fix it?</div>
                  <div className="small text-secondary">Your previous answers are saved — just update what’s needed.</div>
                </div>
                <Link href="/agency/onboarding" className="btn btn-primary">
                  Update and resubmit
                </Link>
              </CardBody>
            </Card>
          </>
        );
      }}
    </AgencyStatusGate>
  );
}
