'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Input, Table } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { adminService } from '@/services/admin.service';
import { useFetch } from '@/hooks/useFetch';
import { useUrlParams, useUrlSearch } from '@/hooks/useUrlParams';
import { AGENCY_STATUS_META, VENDOR_TYPE_OPTIONS, VENDOR_TYPE_LABELS } from '@/constants';
import { formatDate } from '@/utils/format';
import styles from '../panel.module.scss';

function AgencyList() {
  const router = useRouter();
  // Filters live in the URL so they survive reloads and can be linked from the dashboard.
  const { get, page, setParams } = useUrlParams();
  const [search, setSearch] = useUrlSearch();
  const status = get('status');
  const vendorType = get('vendorType');
  const urlSearch = get('search');

  const { data, meta, loading, error, reload } = useFetch(
    () => adminService.listAgencies({ status, vendorType, search: urlSearch, page, limit: 15 }),
    [status, vendorType, urlSearch, page],
  );

  return (
    <>
      <PageHeader
        eyebrow="Vendors"
        title="Agencies & operators"
        subtitle="Review applications and manage vendor verification."
      />

      <Card className="mb-3">
        <CardBody className={styles.filters}>
          <Input
            type="search"
            placeholder="Search business, owner, city or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search vendors"
          />
          <Input type="select" value={status} onChange={(e) => setParams({ status: e.target.value })} aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.entries(AGENCY_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Input>
          <Input type="select" value={vendorType} onChange={(e) => setParams({ vendorType: e.target.value })} aria-label="Filter by vendor type">
            <option value="">All vendor types</option>
            {VENDOR_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Input>
        </CardBody>
      </Card>

      <Card>
        {loading && !data ? (
          <LoadingState label="Loading vendors…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState title="No vendors found" message="Try changing the filters or search terms." />
        ) : (
          <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
            <Table hover className="mb-0">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Account owner</th>
                  <th>City</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a._id} className="cursor-pointer" onClick={() => router.push(`/agencies/${a._id}`)}>
                    <td>
                      <Link href={`/agencies/${a._id}`} className="fw-semibold" onClick={(e) => e.stopPropagation()}>
                        {a.businessName || <span className="text-secondary fst-italic">Not provided yet</span>}
                      </Link>
                    </td>
                    <td className="small">{VENDOR_TYPE_LABELS[a.vendorType]}</td>
                    <td className="small">
                      {a.userId?.fullName}
                      <div className="text-secondary">{a.userId?.email}</div>
                    </td>
                    <td className="small">{a.city || '—'}</td>
                    <td className="small">{formatDate(a.submittedAt)}</td>
                    <td>
                      <StatusBadge status={a.verificationStatus} />
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
    </>
  );
}

export default function AdminAgenciesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AgencyList />
    </Suspense>
  );
}
