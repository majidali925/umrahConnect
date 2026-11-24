'use client';

import Link from 'next/link';
import { Card, CardBody, Row, Col } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import VerificationChecklist from '@/components/common/VerificationChecklist';
import { LoadingState } from '@/components/common/States';
import ImageUploader from '@/components/forms/ImageUploader';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import { useAgency } from '@/features/agency/AgencyContext';
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

/** Header photo for the public agency page, plus a link to see that page. */
function PublicPageCard({ agency }) {
  const { reload } = useAgency();
  return (
    <Card className="mb-4">
      <CardBody className="p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-1">
          <h2 className="h6 section-title mb-0">Your public page</h2>
          <Link href={`/agencies/${agency._id}`} className="small fw-semibold" target="_blank">
            View public page ↗
          </Link>
        </div>
        <p className="small text-secondary mb-3">
          Customers see your header photo, your published packages and their reviews on your agency page. Use a wide,
          landscape photo (at least 1600 px wide) — e.g. your office, a past group or the Haram.
        </p>
        <ImageUploader
          imageUrl={agency.headerImage?.url}
          aspectRatio="16 / 5"
          sizes="(min-width: 992px) 720px, 100vw"
          emptyLabel="No header photo yet"
          onUpload={async (file, onProgress) => {
            await agencyService.uploadHeaderImage(file, onProgress);
            await reload();
          }}
          onRemove={async () => {
            await agencyService.removeHeaderImage();
            await reload();
          }}
        />
      </CardBody>
    </Card>
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
              {agency.verificationStatus === 'APPROVED' && <PublicPageCard agency={agency} />}
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
