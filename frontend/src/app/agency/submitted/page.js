'use client';

import Link from 'next/link';
import { Card, CardBody } from 'reactstrap';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import styles from '../agency.module.scss';

export default function SubmittedPage() {
  return (
    <AgencyStatusGate statuses={['PENDING', 'UNDER_REVIEW']}>
      {({ agency }) => (
        <Card className="mx-auto" style={{ maxWidth: 640 }}>
          <CardBody className="p-4 p-md-5 text-center">
            <div className={styles.successIcon} aria-hidden="true">✓</div>
            <h1 className="h3 mb-2">Application submitted</h1>
            <p className="text-secondary mb-4">
              Thank you! <strong>{agency.businessName}</strong> has been submitted for verification. We’ve emailed you a
              confirmation and will notify you as soon as a decision is made.
            </p>
            <div className="bg-surface rounded-3 p-3 text-start small mb-4">
              <div className="fw-semibold mb-2">What happens next?</div>
              <ol className="mb-0 ps-3">
                <li>Our team reviews your business details.</li>
                <li>Each document is checked individually.</li>
                <li>You’ll receive an approval or feedback by email.</li>
              </ol>
            </div>
            <Link href="/agency/pending-approval" className="btn btn-primary">
              View application status
            </Link>
          </CardBody>
        </Card>
      )}
    </AgencyStatusGate>
  );
}
