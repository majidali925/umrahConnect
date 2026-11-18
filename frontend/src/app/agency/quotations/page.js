'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button, Alert, Nav, NavItem, NavLink } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';
import ConfirmModal from '@/components/common/ConfirmModal';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import { agencyPackageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { useUrlParams } from '@/hooks/useUrlParams';
import { QUOTATION_STATUS_META } from '@/constants';
import { formatCurrency, formatDate, formatDateRange, formatPhone } from '@/utils/format';

const TABS = ['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED'];

const ACTIONS = {
  confirm: {
    title: 'Confirm booking',
    message: (q) =>
      `Reserve ${q.seats} seat(s) on this package for ${q.customer?.fullName}. The customer will be notified and will see your contact details.`,
    confirmLabel: 'Confirm booking',
    confirmColor: 'success',
    run: (q) => agencyPackageService.confirmQuotation(q._id),
  },
  decline: {
    title: 'Decline request',
    message: () => 'The customer will be notified with your reason. No seats are reserved.',
    confirmLabel: 'Decline request',
    confirmColor: 'danger',
    requireReason: true,
    reasonLabel: 'Reason (shared with the customer)',
    reasonPlaceholder: 'e.g. This departure is fully booked. Please consider our January package.',
    run: (q, reason) => agencyPackageService.declineQuotation(q._id, reason),
  },
  cancel: {
    title: 'Cancel confirmed booking',
    message: (q) => `The ${q.seats} reserved seat(s) will be released back to the package quota and the customer notified.`,
    confirmLabel: 'Cancel booking',
    confirmColor: 'danger',
    requireReason: true,
    reasonLabel: 'Reason (shared with the customer)',
    run: (q, reason) => agencyPackageService.cancelBooking(q._id, reason),
  },
};

function QuotationCard({ q, onAction }) {
  const pkg = q.package;
  return (
    <Card className="mb-3">
      <CardBody className="p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
          <div className="min-w-0">
            <div className="d-flex align-items-center gap-2 mb-1">
              <StatusBadge type="quotation" status={q.status} />
              <span className="small text-secondary">Requested {formatDate(q.createdAt, true)}</span>
            </div>
            <h2 className="h6 mb-1">
              {pkg ? <Link href={`/agency/packages/${pkg._id}/edit`}>{pkg.title}</Link> : 'Deleted package'}
            </h2>
            {pkg && (
              <div className="small text-secondary">
                {formatDateRange(pkg.departureDate, pkg.returnDate)} · {pkg.totalSeats - pkg.bookedSeats} of{' '}
                {pkg.totalSeats} seats left
              </div>
            )}
          </div>
          <div className="text-md-end">
            <div className="h5 mb-0">{q.seats} person(s)</div>
            <div className="small text-secondary">Est. {formatCurrency(q.estimatedTotal)}</div>
          </div>
        </div>

        <hr />
        <div className="row g-3 small">
          <div className="col-md-5">
            <div className="text-secondary fw-semibold mb-1">Customer</div>
            <div className="fw-semibold">{q.customer?.fullName}</div>
            <div>
              <a href={`mailto:${q.customer?.email}`}>{q.customer?.email}</a>
            </div>
            <div>
              <a href={`tel:${q.customer?.phone}`}>{formatPhone(q.customer?.phone)}</a>
            </div>
          </div>
          <div className="col-md-7">
            <div className="text-secondary fw-semibold mb-1">Customer message</div>
            <div className="text-break">{q.message || <span className="text-secondary">No message</span>}</div>
            {q.agencyNote && (
              <>
                <div className="text-secondary fw-semibold mt-2 mb-1">Your note</div>
                <div className="text-break">{q.agencyNote}</div>
              </>
            )}
            {q.status === 'CANCELLED' && (
              <div className="text-secondary mt-2">
                Cancelled by {q.cancelledBy === 'AGENCY' ? 'you' : 'the customer'} on {formatDate(q.respondedAt)}
              </div>
            )}
          </div>
        </div>

        {(q.status === 'PENDING' || q.status === 'CONFIRMED') && (
          <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
            {q.status === 'PENDING' ? (
              <>
                <Button color="danger" outline size="sm" onClick={() => onAction('decline', q)}>
                  Decline
                </Button>
                <Button color="success" size="sm" onClick={() => onAction('confirm', q)}>
                  Confirm booking
                </Button>
              </>
            ) : (
              <Button color="danger" outline size="sm" onClick={() => onAction('cancel', q)}>
                Cancel booking
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function QuotationList() {
  const { get, page, setParams } = useUrlParams();
  const status = get('status', 'PENDING');
  const packageId = get('packageId');
  const [pending, setPending] = useState(null); // { action, q }
  const [notice, setNotice] = useState(null);

  const { data, meta, loading, error, reload } = useFetch(
    () => agencyPackageService.listQuotations({ status, packageId, page, limit: 10 }),
    [status, packageId, page],
  );

  const action = pending && ACTIONS[pending.action];
  const counts = meta?.statusCounts || {};

  return (
    <>
      <PageHeader
        eyebrow="Bookings"
        title="Seat requests"
        subtitle="Customers request seats on your packages. Seats are reserved only when you confirm. No payment is collected online."
      />

      {packageId && (
        <Alert color="info" fade={false} className="d-flex justify-content-between align-items-center">
          <span>Showing requests for one package.</span>
          <Button color="link" size="sm" className="p-0" onClick={() => setParams({ packageId: '' })}>
            Show all packages
          </Button>
        </Alert>
      )}
      {notice && (
        <Alert color="success" fade={false} toggle={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Nav tabs className="mb-3">
        {TABS.map((tab) => (
          <NavItem key={tab}>
            <NavLink
              href="#"
              active={status === tab}
              onClick={(e) => {
                e.preventDefault();
                setParams({ status: tab });
              }}
            >
              {QUOTATION_STATUS_META[tab].label}
              {!packageId && counts[tab] ? <span className="ms-1 text-secondary">({counts[tab]})</span> : null}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      {loading && !data ? (
        <LoadingState label="Loading requests…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title="No requests here"
            message={
              status === 'PENDING'
                ? 'New seat requests from customers will appear here.'
                : `No ${QUOTATION_STATUS_META[status].label.toLowerCase()} requests.`
            }
          />
        </Card>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          {data.map((q) => (
            <QuotationCard key={q._id} q={q} onAction={(name, quotation) => setPending({ action: name, q: quotation })} />
          ))}
          <Pagination meta={meta} onChange={(p) => setParams({ page: String(p) })} />
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pending)}
        title={action?.title}
        message={action?.message(pending.q)}
        confirmLabel={action?.confirmLabel}
        confirmColor={action?.confirmColor}
        requireReason={action?.requireReason}
        reasonLabel={action?.reasonLabel}
        reasonPlaceholder={action?.reasonPlaceholder}
        onConfirm={async (reason) => {
          const res = await action.run(pending.q, reason);
          setNotice(res.message);
          await reload();
        }}
        onClose={() => setPending(null)}
      />
    </>
  );
}

export default function AgencyQuotationsPage() {
  return (
    <AgencyStatusGate statuses={['APPROVED']}>
      <Suspense fallback={<LoadingState />}>
        <QuotationList />
      </Suspense>
    </AgencyStatusGate>
  );
}
