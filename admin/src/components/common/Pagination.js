'use client';

import { Pagination as RsPagination, PaginationItem, PaginationLink } from 'reactstrap';

/** Compact pager driven by the API's { page, totalPages, total } meta. */
export default function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) {
    return meta ? <p className="text-secondary small mb-0">{meta.total} result{meta.total === 1 ? '' : 's'}</p> : null;
  }

  const { page, totalPages, total } = meta;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2">
      <p className="text-secondary small mb-0">
        Page {page} of {totalPages} · {total} results
      </p>
      <RsPagination size="sm" className="mb-0" aria-label="Pagination">
        <PaginationItem disabled={page <= 1}>
          <PaginationLink previous onClick={() => onChange(page - 1)} />
        </PaginationItem>
        {pages.map((p) => (
          <PaginationItem key={p} active={p === page}>
            <PaginationLink onClick={() => onChange(p)}>{p}</PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem disabled={page >= totalPages}>
          <PaginationLink next onClick={() => onChange(page + 1)} />
        </PaginationItem>
      </RsPagination>
    </div>
  );
}
