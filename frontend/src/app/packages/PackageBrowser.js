'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Input, Row, Col, Label, Button, Alert } from 'reactstrap';
import Pagination from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { browseQuery, SORT_OPTIONS, PRICE_OPTIONS } from '@/features/packages/browseQuery';
import PackageCard from '@/features/packages/components/PackageCard';
import CompareTray from '@/features/packages/components/CompareTray';
import { packageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { useUrlParams, useUrlSearch } from '@/hooks/useUrlParams';

// Wait this long after the last keystroke before searching.
const SEARCH_DELAY = 500;

/**
 * The filterable package list. The server renders it with the first results already
 * loaded (`initial`, so search engines see the packages); filters then load in the browser.
 */
export default function PackageBrowser({ initial }) {
  const { get, setParams } = useUrlParams();
  const [search, setSearch, searchPending] = useUrlSearch('search', { delay: SEARCH_DELAY });
  const filters = browseQuery(get);
  // On phones the filters (other than search) fold away behind a button.
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = [filters.departureCity, filters.from, filters.maxPrice].filter(Boolean).length;
  const filterCol = showFilters ? '' : 'd-none d-md-block';

  const { data: cities } = useFetch(() => packageService.departureCities(), []);
  const { data, meta, loading, error, reload } = useFetch(
    () => packageService.browse(filters),
    [filters.page, filters.search, filters.departureCity, filters.agencyId, filters.from, filters.maxPrice, filters.sort],
    { initialData: initial?.data, initialMeta: initial?.meta },
  );
  const agencyName = filters.agencyId ? data?.[0]?.agency?.businessName || 'this agency' : null;
  const searching = searchPending || (loading && Boolean(filters.search));

  return (
    <>
      {filters.agencyId && (
        <Alert color="success" fade={false} className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>
            Showing packages from <strong>{agencyName}</strong> ·{' '}
            <Link href={`/agencies/${filters.agencyId}`}>View agency page &amp; reviews</Link>
          </span>
          <Button color="link" size="sm" className="p-0" onClick={() => setParams({ agencyId: '' })}>
            Show all packages
          </Button>
        </Alert>
      )}

      <Card className="mb-4">
        <CardBody>
          <Row className="g-3">
            <Col md={4}>
              <Label for="pkg-search" className="small">
                Search
                {searching && (
                  <span className="text-secondary ms-2" role="status">
                    Searching…
                  </span>
                )}
              </Label>
              <div className="d-flex gap-2">
                <Input
                  id="pkg-search"
                  type="search"
                  placeholder="Package, hotel, agency or city…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button
                  color={activeFilters ? 'primary' : 'light'}
                  outline={Boolean(activeFilters)}
                  className="d-md-none border text-nowrap"
                  aria-expanded={showFilters}
                  aria-controls="pkg-filters"
                  onClick={() => setShowFilters((v) => !v)}
                >
                  Filters{activeFilters ? ` (${activeFilters})` : ''}
                </Button>
              </div>
            </Col>
            <Col sm={6} md={2} className={filterCol} id="pkg-filters">
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
            <Col sm={6} md={2} className={filterCol}>
              <Label for="pkg-from" className="small">
                Departing after
              </Label>
              <Input id="pkg-from" type="date" value={filters.from} onChange={(e) => setParams({ from: e.target.value })} />
            </Col>
            <Col sm={6} md={2} className={filterCol}>
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
            <Col sm={6} md={2} className={filterCol}>
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
            message={
              filters.agencyId
                ? `${agencyName} has no packages matching these filters right now.`
                : 'Try different filters, or check back soon — verified agencies add new departures regularly.'
            }
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
      <CompareTray />
    </>
  );
}
