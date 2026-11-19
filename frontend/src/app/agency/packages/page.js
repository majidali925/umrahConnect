'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Table, Button, ButtonGroup, Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';
import ConfirmModal from '@/components/common/ConfirmModal';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import { agencyPackageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { useUrlParams } from '@/hooks/useUrlParams';
import { PACKAGE_STATUS_META } from '@/constants';
import { formatCurrency, formatDate } from '@/utils/format';

const FILTERS = [
  { value: '', label: 'All packages' },
  { value: 'PUBLISHED', label: PACKAGE_STATUS_META.PUBLISHED.label },
  { value: 'DRAFT', label: 'Drafts' },
];

const packageStatus = (p) => (p.isExpired ? 'EXPIRED' : p.status);

const ACTIONS = {
  publish: {
    title: 'Publish package',
    message: 'The package will be listed publicly and customers can request seats.',
    confirmLabel: 'Publish',
    confirmColor: 'success',
    run: (p) => agencyPackageService.setStatus(p._id, 'PUBLISHED'),
  },
  unpublish: {
    title: 'Unpublish package',
    message: 'The package will be hidden from customers. Existing requests and bookings are kept.',
    confirmLabel: 'Unpublish',
    run: (p) => agencyPackageService.setStatus(p._id, 'DRAFT'),
  },
  delete: {
    title: 'Delete package',
    message:
      'This permanently deletes the package. Packages with pending requests or confirmed bookings cannot be deleted — unpublish them instead.',
    confirmLabel: 'Delete package',
    confirmColor: 'danger',
    run: (p) => agencyPackageService.remove(p._id),
  },
};

function PackageList() {
  const { get, page, setParams } = useUrlParams();
  const status = get('status');
  const [pending, setPending] = useState(null); // { action, pkg }
  const [notice, setNotice] = useState(null);

  const { data, meta, loading, error, reload } = useFetch(
    () => agencyPackageService.list({ status, page, limit: 15 }),
    [status, page],
  );

  const action = pending && ACTIONS[pending.action];

  return (
    <>
      <PageHeader
        eyebrow="Packages"
        title="Your Umrah packages"
        subtitle="Create packages for upcoming dates, set the seat quota and publish when ready."
        actions={
          <Link href="/agency/packages/new" className="btn btn-primary">
            + New package
          </Link>
        }
      />

      {notice && (
        <Alert color="success" fade={false} toggle={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Card>
        <CardBody className="border-bottom py-3">
          <ButtonGroup role="group" aria-label="Filter packages by status" className="flex-wrap">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                color="primary"
                outline={status !== f.value}
                onClick={() => setParams({ status: f.value })}
                aria-pressed={status === f.value}
              >
                {f.label}
              </Button>
            ))}
          </ButtonGroup>
        </CardBody>
        {loading && !data ? (
          <LoadingState label="Loading packages…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState
            title={status ? 'No packages match this filter' : 'No packages yet'}
            message="Create your first package to start receiving seat requests from customers."
            action={
              <Link href="/agency/packages/new" className="btn btn-primary mt-2">
                Create a package
              </Link>
            }
          />
        ) : (
          <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
            <Table className="mb-0 align-middle table-stack">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Travel dates</th>
                  <th>Price / person</th>
                  <th>Seats booked</th>
                  <th>Requests</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => {
                  const pendingCount = p.quotationCounts?.PENDING || 0;
                  return (
                    <tr key={p._id}>
                      <td className="cell-title" style={{ minWidth: '10rem' }}>
                        <Link href={`/agency/packages/${p._id}/edit`} className="fw-semibold">
                          {p.title}
                        </Link>
                        <div className="small text-secondary">
                          From {p.departureCity} · {p.durationDays} days
                        </div>
                      </td>
                      <td className="small text-nowrap" data-label="Travel dates">
                        {/* Two lines on desktop keep the actions column in view. */}
                        <div>{formatDate(p.departureDate)}</div>
                        <div className="text-secondary">→ {formatDate(p.returnDate)}</div>
                      </td>
                      <td className="small text-nowrap" data-label="Price / person">{formatCurrency(p.pricePerPerson)}</td>
                      <td className="small text-nowrap" data-label="Seats booked">
                        <div>
                          <span className="fw-semibold">{p.bookedSeats}</span> / {p.totalSeats}
                          {p.availableSeats === 0 && <div className="text-danger">Fully booked</div>}
                        </div>
                      </td>
                      <td className="small" data-label="Requests">
                        <Link href={`/agency/quotations?packageId=${p._id}`}>
                          {pendingCount ? (
                            <span className="badge rounded-pill badge-soft badge-soft-warning">{pendingCount} pending</span>
                          ) : (
                            'View'
                          )}
                        </Link>
                      </td>
                      <td data-label="Status">
                        <StatusBadge type="package" status={packageStatus(p)} />
                      </td>
                      <td className="text-end text-nowrap cell-actions">
                        <Link href={`/agency/packages/${p._id}/edit`} className="btn btn-sm btn-light border me-1">
                          Edit
                        </Link>
                        {p.status === 'PUBLISHED' ? (
                          <Button size="sm" color="light" className="border me-1" onClick={() => setPending({ action: 'unpublish', pkg: p })}>
                            Unpublish
                          </Button>
                        ) : (
                          !p.isExpired && (
                            <Button size="sm" color="success" outline className="me-1" onClick={() => setPending({ action: 'publish', pkg: p })}>
                              Publish
                            </Button>
                          )
                        )}
                        <Button size="sm" color="danger" outline onClick={() => setPending({ action: 'delete', pkg: p })}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        {data && data.length > 0 && (
          <CardBody className="border-top">
            <Pagination meta={meta} onChange={(p) => setParams({ page: String(p) })} />
          </CardBody>
        )}
      </Card>

      <ConfirmModal
        isOpen={Boolean(pending)}
        title={action?.title}
        message={
          action && (
            <>
              <strong className="d-block text-body mb-1">{pending.pkg.title}</strong>
              {action.message}
            </>
          )
        }
        confirmLabel={action?.confirmLabel}
        confirmColor={action?.confirmColor}
        onConfirm={async () => {
          const res = await action.run(pending.pkg);
          setNotice(res.message);
          await reload();
        }}
        onClose={() => setPending(null)}
      />
    </>
  );
}

export default function AgencyPackagesPage() {
  return (
    <AgencyStatusGate statuses={['APPROVED']}>
      <Suspense fallback={<LoadingState />}>
        <PackageList />
      </Suspense>
    </AgencyStatusGate>
  );
}
