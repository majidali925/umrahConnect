'use client';

import Link from 'next/link';
import { Card, CardBody, Row, Col } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import VerificationChecklist from '@/components/common/VerificationChecklist';
import { LoadingState } from '@/components/common/States';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import ApplicationSummary from '@/features/agency/components/ApplicationSummary';
import { agencyService } from '@/services/agency.service';
import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/utils/format';
import styles from '../agency.module.scss';

/** Asks the server whether publishing is allowed — the UI never decides this itself. */
function PublishingAccess() {
  const { data, loading, error } = useFetch(() => agencyService.getPublishingAccess(), []);
  if (loading) return <LoadingState compact label="Checking publishing access…" />;
  return data?.canPublish ? (
    <>
      <div className="fw-semibold text-success mb-1">Publishing enabled</div>
      <p className="small text-secondary mb-3">
        Your agency is approved. Create Umrah packages for upcoming dates and confirm customers’ seat requests.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Link href="/agency/packages/new" className="btn btn-primary btn-sm">
          + New package
        </Link>
        <Link href="/agency/packages" className="btn btn-light border btn-sm">
          My packages
        </Link>
        <Link href="/agency/quotations" className="btn btn-light border btn-sm">
          Seat requests
        </Link>
      </div>
    </>
  ) : (
    <>
      <div className="fw-semibold mb-1">Publishing locked</div>
      <p className="small text-secondary mb-0">{error}</p>
    </>
  );
}

export default function AgencyProfilePage() {
  return (
    <AgencyStatusGate>
      {({ agency, verificationSummary }) => (
        <>
          <PageHeader
            eyebrow="Agency profile"
            title={agency.businessName || 'Your agency'}
            subtitle={
              agency.approvedAt ? `Verified on ${formatDate(agency.approvedAt)}` : 'Profile details from your application'
            }
            actions={<StatusBadge status={agency.verificationStatus} className="fs-6" />}
          />
          <Row className="g-4">
            <Col lg={8}>
              <Card>
                <CardBody className="p-4">
                  <ApplicationSummary agency={agency} />
                </CardBody>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className={`mb-4 ${styles.publishCard}`}>
                <CardBody className="p-4">
                  <h2 className="h6 section-title mb-3">Publishing</h2>
                  <PublishingAccess />
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  <h2 className="h6 section-title mb-3">Verification</h2>
                  <VerificationChecklist summary={verificationSummary} />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </AgencyStatusGate>
  );
}
