'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, ButtonGroup, Card, CardBody, Input, Table } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';
import ConfirmModal from '@/components/common/ConfirmModal';
import DocumentViewButton from '@/components/common/DocumentViewButton';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { adminService } from '@/services/admin.service';
import { useFetch } from '@/hooks/useFetch';
import { useUrlParams, useUrlSearch } from '@/hooks/useUrlParams';
import { FEATURE_STATE_META } from '@/constants';
import { formatCurrency, formatDate, formatPhone } from '@/utils/format';

const TABS = [
  { value: 'PENDING', label: 'Awaiting approval' },
  { value: 'ACTIVE', label: 'Featured now' },
  { value: 'ENDED', label: 'Ended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Withdrawn' },
  { value: 'ALL', label: 'All' },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const ACTIONS = {
  approve: {
    title: 'Approve feature request',
    message: (r) => (
      <>
        The package will be shown at the top of search results with a Featured label for{' '}
        <strong>{plural(r.days, 'day')}</strong>, starting now.{' '}
        {r.hasPaymentProof ? (
          <>Check the attached payment screenshot matches the <strong>{formatCurrency(r.price)}</strong> fee.</>
        ) : (
          <>
            No payment screenshot was attached: make sure the <strong>{formatCurrency(r.price)}</strong> fee has been paid.
          </>
        )}
      </>
    ),
    confirmLabel: 'Approve and feature',
    confirmColor: 'success',
    run: (r) => adminService.approveFeature(r._id),
  },
  reject: {
    title: 'Reject feature request',
    message: () => 'The agency will be emailed the reason.',
    confirmLabel: 'Reject request',
    confirmColor: 'danger',
    requireReason: true,
    reasonPlaceholder: 'e.g. Payment was not received',
    run: (r, reason) => adminService.rejectFeature(r._id, reason),
  },
  end: {
    title: 'End featuring now',
    message: () => 'The package goes back to its normal place in search results straight away. The agency will be emailed the reason.',
    confirmLabel: 'End featuring',
    confirmColor: 'danger',
    requireReason: true,
    reasonPlaceholder: 'e.g. Payment was not received in time',
    run: (r, reason) => adminService.endFeature(r._id, reason),
  },
};

/** When the package is (or was) featured, or why the request was turned down. */
function Period({ r }) {
  if (r.state === 'ACTIVE' || r.state === 'ENDED') {
    return (
      <>
        <div>{formatDate(r.startsAt, true)}</div>
        <div className="text-secondary">→ {formatDate(r.endsAt, true)}</div>
        {r.endedEarlyAt && <div className="text-danger">Ended early: {r.decisionNote}</div>}
      </>
    );
  }
  if (r.state === 'REJECTED') return <span className="text-danger">{r.decisionNote}</span>;
  return <span className="text-secondary">—</span>;
}

function FeatureRequestList() {
  const { get, page, setParams } = useUrlParams();
  const [search, setSearch] = useUrlSearch();
  // The queue of requests to decide is what an admin usually comes here for.
  const tab = get('state') || 'PENDING';
  const urlSearch = get('search');
  const [pending, setPending] = useState(null); // { action, request }
  const [notice, setNotice] = useState(null);
  const [fileError, setFileError] = useState(null);

  const { data, meta, loading, error, reload } = useFetch(
    () =>
      adminService.listFeatureRequests({ state: tab === 'ALL' ? '' : tab, search: urlSearch, page, limit: 15 }),
    [tab, urlSearch, page],
  );
  const counts = meta?.stateCounts || {};
  const action = pending && ACTIONS[pending.action];

  return (
    <>
      <PageHeader
        eyebrow="Vendors"
        title="Featured requests"
        subtitle="Agencies apply to feature a package for 7 days. Approved packages appear first in search results with a Featured label. Applications with a payment screenshot are listed first."
      />

      {fileError && (
        <Alert color="danger" fade={false} toggle={() => setFileError(null)}>
          {fileError}
        </Alert>
      )}

      {notice && (
        <Alert color="success" fade={false} toggle={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Card>
        <CardBody className="border-bottom py-3 d-flex flex-wrap align-items-center gap-2">
          <ButtonGroup role="group" aria-label="Filter requests by status" className="flex-wrap">
            {TABS.map((t) => (
              <Button
                key={t.value}
                size="sm"
                color="primary"
                outline={tab !== t.value}
                onClick={() => setParams({ state: t.value })}
                aria-pressed={tab === t.value}
              >
                {t.label}
                {counts[t.value] > 0 && <span className="ms-1">({counts[t.value]})</span>}
              </Button>
            ))}
          </ButtonGroup>
          <div className="ms-md-auto" style={{ flex: '1 1 14rem', maxWidth: '22rem' }}>
            <Input
              type="search"
              bsSize="sm"
              placeholder="Search package or agency…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search feature requests"
            />
          </div>
        </CardBody>

        {loading && !data ? (
          <LoadingState label="Loading requests…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState
            title={tab === 'PENDING' && !urlSearch ? 'No requests waiting' : 'No requests found'}
            message={
              tab === 'PENDING' && !urlSearch
                ? 'New requests from agencies will appear here.'
                : 'Try a different tab or search.'
            }
          />
        ) : (
          <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
            <Table className="mb-0 align-middle table-stack">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Agency</th>
                  <th>Fee & payment</th>
                  <th>Requested</th>
                  <th>Featured period</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r._id}>
                    <td className="cell-title" style={{ minWidth: '12rem' }}>
                      <div className="fw-semibold">{r.package?.title || r.packageTitle}</div>
                      {r.package ? (
                        <div className="small text-secondary">
                          From {r.package.departureCity} · departs {formatDate(r.package.departureDate)}
                          {!r.package.isListed && r.state === 'PENDING' && (
                            <div className="text-danger">No longer listed publicly</div>
                          )}
                        </div>
                      ) : (
                        <div className="small text-danger">Package deleted</div>
                      )}
                      {r.note && <div className="small fst-italic mt-1">“{r.note}”</div>}
                    </td>
                    <td className="small" data-label="Agency">
                      {r.agency ? (
                        <Link href={`/agencies/${r.agency._id}`} className="fw-semibold">
                          {r.agency.businessName}
                        </Link>
                      ) : (
                        '—'
                      )}
                      {r.application && (
                        <div className="text-secondary text-break">
                          {r.application.contactName}
                          <div>{formatPhone(r.application.phone)}</div>
                          <div>{r.application.email}</div>
                        </div>
                      )}
                    </td>
                    <td className="small text-nowrap" data-label="Fee & payment">
                      <div className="fw-semibold">
                        {formatCurrency(r.price)} · {plural(r.days, 'day')}
                      </div>
                      {r.hasPaymentProof ? (
                        <div className="mt-1 d-flex align-items-center gap-2">
                          <span className="badge rounded-pill badge-soft badge-soft-success">Payment attached</span>
                          <DocumentViewButton
                            label="View"
                            load={() => adminService.getFeaturePaymentProofBlob(r._id)}
                            onError={setFileError}
                          />
                        </div>
                      ) : (
                        <div className="text-secondary">No payment screenshot</div>
                      )}
                    </td>
                    <td className="small text-nowrap" data-label="Requested">
                      {formatDate(r.createdAt, true)}
                    </td>
                    <td className="small" data-label="Featured period" style={{ maxWidth: '16rem' }}>
                      <Period r={r} />
                      {r.reviewedBy && <div className="text-secondary">by {r.reviewedBy.fullName}</div>}
                    </td>
                    <td data-label="Status">
                      <StatusBadge type="feature" status={r.state} />
                    </td>
                    <td className="text-end text-nowrap cell-actions">
                      {r.actions.canApprove && (
                        <Button
                          size="sm"
                          color="success"
                          className="me-1"
                          disabled={!r.package?.isListed}
                          title={r.package?.isListed ? undefined : 'The package is no longer listed publicly'}
                          onClick={() => setPending({ action: 'approve', request: r })}
                        >
                          Approve
                        </Button>
                      )}
                      {r.actions.canReject && (
                        <Button size="sm" color="danger" outline onClick={() => setPending({ action: 'reject', request: r })}>
                          Reject
                        </Button>
                      )}
                      {r.actions.canEnd && (
                        <Button size="sm" color="danger" outline onClick={() => setPending({ action: 'end', request: r })}>
                          End now
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
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
              <strong className="d-block text-body mb-1">
                {pending.request.packageTitle} · {pending.request.agency?.businessName}
              </strong>
              {action.message(pending.request)}
            </>
          )
        }
        confirmLabel={action?.confirmLabel}
        confirmColor={action?.confirmColor}
        requireReason={action?.requireReason}
        reasonPlaceholder={action?.reasonPlaceholder}
        onConfirm={async (reason) => {
          const res = await action.run(pending.request, reason);
          setNotice(res.message);
          await reload();
        }}
        onClose={() => setPending(null)}
      />
    </>
  );
}

export default function FeaturedRequestsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FeatureRequestList />
    </Suspense>
  );
}
