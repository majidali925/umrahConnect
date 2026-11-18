'use client';

import Link from 'next/link';
import { Card, CardBody, Row, Col } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import VerificationChecklist from '@/components/common/VerificationChecklist';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import { formatDate } from '@/utils/format';
import styles from '../agency.module.scss';

export default function PendingApprovalPage() {
  return (
    <AgencyStatusGate statuses={['PENDING', 'UNDER_REVIEW']}>
      {({ agency, documentRequirements, verificationSummary }) => {
        const underReview = agency.verificationStatus === 'UNDER_REVIEW';
        return (
          <>
            <PageHeader
              eyebrow="Application status"
              title={agency.businessName}
              subtitle="Your application is with our verification team."
              actions={<StatusBadge status={agency.verificationStatus} className="fs-6" />}
            />
            <Row className="g-4">
              <Col lg={7}>
                <Card className="h-100">
                  <CardBody className="p-4">
                    <h2 className="h6 section-title mb-4">Progress</h2>
                    <ol className={styles.timeline}>
                      <li className={styles.done}>
                        <div className="fw-semibold">Application submitted</div>
                        <div className="small text-secondary">{formatDate(agency.submittedAt, true)}</div>
                      </li>
                      <li className={underReview ? styles.active : ''}>
                        <div className="fw-semibold">Under review</div>
                        <div className="small text-secondary">
                          {underReview ? `Started ${formatDate(agency.reviewStartedAt, true)}` : 'Waiting for a reviewer'}
                        </div>
                      </li>
                      <li>
                        <div className="fw-semibold">Decision</div>
                        <div className="small text-secondary">You’ll be notified by email</div>
                      </li>
                    </ol>
                    <p className="small text-secondary mb-0">
                      While your application is being reviewed, details and documents are locked. Publishing features
                      unlock once your application is approved.
                    </p>
                  </CardBody>
                </Card>
              </Col>
              <Col lg={5}>
                <Card className="mb-4">
                  <CardBody className="p-4">
                    <h2 className="h6 section-title mb-3">Verification checks</h2>
                    <VerificationChecklist summary={verificationSummary} />
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="p-4">
                    <h2 className="h6 section-title mb-3">Documents</h2>
                    <ul className="list-unstyled mb-3">
                      {documentRequirements
                        .filter((r) => r.document)
                        .map((r) => (
                          <li key={r.type} className="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom small">
                            <span>{r.label}</span>
                            <StatusBadge type="document" status={r.document.verificationStatus} />
                          </li>
                        ))}
                    </ul>
                    <Link href="/agency/documents" className="small fw-semibold">
                      View documents
                    </Link>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
        );
      }}
    </AgencyStatusGate>
  );
}
