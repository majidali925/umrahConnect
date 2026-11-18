'use client';

import { Suspense } from 'react';
import { Card, CardBody, Input, Row, Col, Label } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import PackageCard from '@/features/packages/components/PackageCard';
import { packageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { useUrlParams, useUrlSearch } from '@/hooks/useUrlParams';

const SORT_OPTIONS = [
  { value: 'departure', label: 'Departure: soonest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
];

const PRICE_OPTIONS = [200000, 300000, 400000, 500000, 750000, 1000000];

function PackageBrowser() {
  const { get, page, setParams } = useUrlParams();
  const [search, setSearch] = useUrlSearch();
  const filters = {
    search: get('search'),
    departureCity: get('departureCity'),
    from: get('from'),
    maxPrice: get('maxPrice'),
    sort: get('sort') || 'departure',
  };

  const { data: cities } = useFetch(() => packageService.departureCities(), []);
  const { data, meta, loading, error, reload } = useFetch(
    () => packageService.browse({ ...filters, page, limit: 12 }),
    [page, filters.search, filters.departureCity, filters.from, filters.maxPrice, filters.sort],
  );

  return (
    <>
      <PageHeader
        eyebrow="Umrah packages"
        title="Find your Umrah package"
        subtitle="Upcoming packages from verified agencies. Request seats online — the agency confirms your booking directly."
      />

      <Card className="mb-4">
        <CardBody>
          <Row className="g-3">
            <Col md={4}>
              <Label for="pkg-search" className="small">
                Search
              </Label>
              <Input
                id="pkg-search"
                type="search"
                placeholder="Package, hotel or city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col sm={6} md={2}>
              <Label for="pkg-city" className="small">
                Departing from
              </Label>
              <Input id="pkg-city" type="select" value={filters.departureCity} onChange={(e) => setParams({ departureCity: e.target.value })}>
                <option value="">Any city</option>
                {(cities || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Input>
            </Col>
            <Col sm={6} md={2}>
              <Label for="pkg-from" className="small">
                Departing after
              </Label>
              <Input id="pkg-from" type="date" value={filters.from} onChange={(e) => setParams({ from: e.target.value })} />
            </Col>
            <Col sm={6} md={2}>
              <Label for="pkg-price" className="small">
                Max price / person
              </Label>
              <Input id="pkg-price" type="select" value={filters.maxPrice} onChange={(e) => setParams({ maxPrice: e.target.value })}>
                <option value="">Any price</option>
                {PRICE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    Up to Rs {p.toLocaleString('en-PK')}
                  </option>
                ))}
              </Input>
            </Col>
            <Col sm={6} md={2}>
              <Label for="pkg-sort" className="small">
                Sort by
              </Label>
              <Input id="pkg-sort" type="select" value={filters.sort} onChange={(e) => setParams({ sort: e.target.value })}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Input>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {loading && !data ? (
        <LoadingState label="Loading packages…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title="No packages found"
            message="Try different filters, or check back soon — verified agencies add new departures regularly."
          />
        </Card>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <Row className="g-4 mb-4">
            {data.map((pkg) => (
              <Col key={pkg._id} md={6} lg={4}>
                <PackageCard pkg={pkg} />
              </Col>
            ))}
          </Row>
          <Pagination meta={meta} onChange={(p) => setParams({ page: String(p) })} />
        </div>
      )}
    </>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PackageBrowser />
    </Suspense>
  );
}
