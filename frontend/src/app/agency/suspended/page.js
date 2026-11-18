'use client';

import { Card, CardBody, Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import { formatDate } from '@/utils/format';

export default function SuspendedPage() {
  return (
    <AgencyStatusGate statuses={['SUSPENDED']}>
      {({ agency }) => (
        <>
          <PageHeader
            eyebrow="Account status"
            title="Vendor account suspended"
            subtitle={`Suspended on ${formatDate(agency.suspendedAt, true)}`}
            actions={<StatusBadge status="SUSPENDED" className="fs-6" />}
          />
          <Alert color="dark" fade={false}>
            <div className="fw-semibold mb-1">Reason</div>
            <div style={{ whiteSpace: 'pre-line' }}>{agency.suspensionReason}</div>
          </Alert>
          <Card>
            <CardBody className="p-4">
              <p className="mb-2">
                While suspended, <strong>{agency.businessName}</strong> cannot access publishing features and is not
                visible to pilgrims.
              </p>
              <p className="text-secondary mb-0">
                If you believe this is a mistake or have resolved the issue, please contact UmrahConnect support.
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </AgencyStatusGate>
  );
}
