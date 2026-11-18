'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardBody, Row, Col, Button, Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import DetailList from '@/components/common/DetailList';
import ConfirmModal from '@/components/common/ConfirmModal';
import VerificationChecklist from '@/components/common/VerificationChecklist';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import ApplicationSummary from '@/features/admin/components/ApplicationSummary';
import DocumentReviewItem from '@/features/admin/components/DocumentReviewItem';
import AuditLogList from '@/features/admin/components/AuditLogList';
import { adminService } from '@/services/admin.service';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatPhone } from '@/utils/format';

const ACTIONS = {
  review: {
    title: 'Start review',
    message: 'Mark this application as under review. The vendor will see that a reviewer is working on it.',
    confirmLabel: 'Start review',
    run: (id) => adminService.startReview(id),
  },
  approve: {
    title: 'Approve application',
    message: 'The vendor will be verified and gain access to publishing features. They will be notified by email.',
    confirmLabel: 'Approve vendor',
    confirmColor: 'success',
    run: (id) => adminService.approve(id),
  },
  reject: {
    title: 'Reject application',
    message: 'The vendor will be able to update their application and resubmit it. Explain clearly what needs to change.',
    confirmLabel: 'Reject application',
    confirmColor: 'danger',
    requireReason: true,
    reasonLabel: 'Rejection reason (shared with the vendor)',
    reasonPlaceholder: 'e.g. The travel agency license has expired. Please upload a renewed license.',
    run: (id, reason) => adminService.reject(id, reason),
  },
  suspend: {
    title: 'Suspend vendor',
    message: 'Suspended vendors immediately lose access to publishing features.',
    confirmLabel: 'Suspend vendor',
    confirmColor: 'dark',
    requireReason: true,
    reasonLabel: 'Suspension reason (shared with the vendor)',
    run: (id, reason) => adminService.suspend(id, reason),
  },
  reinstate: {
    title: 'Reinstate vendor',
    message: 'Restore this vendor to approved status and re-enable publishing access.',
    confirmLabel: 'Reinstate',
    confirmColor: 'success',
    run: (id) => adminService.reinstate(id),
  },
};

function AgencyDetail() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useFetch(() => adminService.getAgency(id), [id]);
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState(null);

  if (loading && !data) return <LoadingState label="Loading application…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { agency, user, documentRequirements, verificationSummary, auditLogs, actions, approvedBy, missingRequirements } = data;
  const current = action ? ACTIONS[action] : null;
  const unapprovedRequired = documentRequirements.filter((r) => r.required && r.document?.verificationStatus !== 'APPROVED');

  const runAction = async (reason) => {
    const res = await current.run(id, reason);
    setData(res.data);
    setNotice(res.message);
  };

  return (
    <>
      <div className="mb-2">
        <Link href="/agencies" className="small fw-semibold">
          ← All vendors
        </Link>
      </div>
      <PageHeader
        title={agency.businessName || 'Untitled application'}
        subtitle={`${verificationSummary.vendorTypeLabel}${agency.city ? ` · ${agency.city}` : ''}`}
        actions={
          <>
            <StatusBadge status={agency.verificationStatus} className="fs-6 align-self-center me-1" />
            {actions.canStartReview && (
              <Button color="primary" outline onClick={() => setAction('review')}>
                Start review
              </Button>
            )}
            {actions.canApprove && (
              <Button color="success" onClick={() => setAction('approve')} disabled={unapprovedRequired.length > 0}>
                Approve
              </Button>
            )}
            {actions.canReject && (
              <Button color="danger" outline onClick={() => setAction('reject')}>
                Reject
              </Button>
            )}
            {actions.canSuspend && (
              <Button color="dark" outline onClick={() => setAction('suspend')}>
                Suspend
              </Button>
            )}
            {actions.canReinstate && (
              <Button color="success" onClick={() => setAction('reinstate')}>
                Reinstate
              </Button>
            )}
          </>
        }
      />

      {notice && (
        <Alert color="success" fade={false} toggle={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {actions.canApprove && unapprovedRequired.length > 0 && (
        <Alert color="info" fade={false}>
          Approve each required document before approving the application:{' '}
          <strong>{unapprovedRequired.map((r) => r.label).join(', ')}</strong>.
        </Alert>
      )}
      {agency.verificationStatus === 'DRAFT' && (
        <Alert color="secondary" fade={false}>
          This vendor has not submitted their application yet ({missingRequirements.fields.length + missingRequirements.documents.length} items
          incomplete).
        </Alert>
      )}
      {agency.verificationStatus === 'REJECTED' && agency.rejectionReason && (
        <Alert color="danger" fade={false}>
          <strong>Rejection reason:</strong> {agency.rejectionReason}
        </Alert>
      )}
      {agency.verificationStatus === 'SUSPENDED' && agency.suspensionReason && (
        <Alert color="dark" fade={false}>
          <strong>Suspension reason:</strong> {agency.suspensionReason}
        </Alert>
      )}

      <Row className="g-4">
        <Col xl={8}>
          <Card className="mb-4">
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Verification documents</h2>
              {documentRequirements.map((req) => (
                <DocumentReviewItem
                  key={req.type}
                  agencyId={id}
                  requirement={req}
                  canReview={actions.canApprove}
                  onUpdated={(next) => {
                    setData(next);
                    setNotice(null);
                  }}
                />
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4">
              <ApplicationSummary agency={agency} />
            </CardBody>
          </Card>
        </Col>

        <Col xl={4}>
          <Card className="mb-4">
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Verification summary</h2>
              <VerificationChecklist summary={verificationSummary} />
              {agency.vendorType === 'INDEPENDENT_OPERATOR' && (
                <p className="small text-secondary mt-3 mb-0">
                  Independent operators are not licensed travel agencies and are never labelled as such.
                </p>
              )}
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Timeline</h2>
              <DetailList
                items={[
                  { label: 'Registered', value: formatDate(agency.createdAt) },
                  { label: 'Submitted', value: formatDate(agency.submittedAt, true) },
                  { label: 'Review started', value: formatDate(agency.reviewStartedAt, true), hidden: !agency.reviewStartedAt },
                  { label: 'Approved', value: formatDate(agency.approvedAt, true), hidden: !agency.approvedAt },
                  { label: 'Approved by', value: approvedBy?.fullName, hidden: !approvedBy },
                  { label: 'Suspended', value: formatDate(agency.suspendedAt, true), hidden: !agency.suspendedAt },
                ]}
              />
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Account owner</h2>
              {user ? (
                <DetailList
                  items={[
                    { label: 'Name', value: user.fullName },
                    { label: 'Email', value: user.email },
                    { label: 'Mobile', value: formatPhone(user.phone) },
                    { label: 'Verified', value: [user.isEmailVerified && 'Email', user.isPhoneVerified && 'Mobile'].filter(Boolean).join(', ') || 'No' },
                  ]}
                />
              ) : (
                <p className="text-secondary mb-0">Account not found.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-2">Activity</h2>
              {auditLogs.length ? <AuditLogList logs={auditLogs} /> : <EmptyState title="No activity yet" />}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {current && (
        <ConfirmModal
          isOpen
          title={current.title}
          message={current.message}
          confirmLabel={current.confirmLabel}
          confirmColor={current.confirmColor}
          requireReason={current.requireReason}
          reasonLabel={current.reasonLabel}
          reasonPlaceholder={current.reasonPlaceholder}
          onConfirm={runAction}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}

export default function AdminAgencyDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AgencyDetail />
    </Suspense>
  );
}
