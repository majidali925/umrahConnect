'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import { LoadingState, EmptyState } from '@/components/common/States';
import { Stars } from '@/features/packages/components/PackageCard';
import { useCompare, compareHref, MAX_COMPARE } from '@/features/packages/compareStore';
import { packageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { INCLUSION_OPTIONS, ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDate, formatDistance } from '@/utils/format';
import styles from './compare.module.scss';

const isId = (s) => /^[a-f0-9]{24}$/i.test(s);

/** Index(es) of the best value among available packages, or [] when there is nothing to pick between. */
function best(packages, value, pick = Math.min) {
  const values = packages.map((p) => (p ? value(p) : null));
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length < 2) return [];
  const target = pick(...present);
  if (present.every((v) => v === target)) return []; // all equal: nothing stands out
  return values.flatMap((v, i) => (v === target ? [i] : []));
}

function Row({ label, cells, highlight = [] }) {
  return (
    <div className={styles.row} role="row">
      <div className={styles.label} role="rowheader">
        {label}
      </div>
      {cells.map((cell, i) => (
        <div key={i} className={`${styles.cell} ${highlight.includes(i) ? styles.best : ''}`} role="cell">
          {cell}
        </div>
      ))}
    </div>
  );
}

function Section({ title }) {
  return (
    <div className={styles.section} role="row">
      <div role="rowheader">{title}</div>
    </div>
  );
}

const hotelCell = (h) => (
  <>
    <div className="fw-semibold">{h.name}</div>
    <Stars count={h.stars} />
  </>
);

function Comparison() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, remove } = useCompare();

  // The URL decides what is compared (so a comparison can be shared); without one, use the
  // visitor's saved picks.
  const urlIds = searchParams.get('ids');
  const fromUrl = urlIds === null ? items.map((x) => x._id) : urlIds.split(',').filter(isId);
  const ids = [...new Set(fromUrl)].slice(0, MAX_COMPARE);
  const key = ids.join(',');

  const { data: results, loading } = useFetch(
    async () => ({ data: await Promise.allSettled(ids.map((id) => packageService.get(id).then((r) => r.data))) }),
    [key],
  );

  const removeColumn = (id) => {
    remove(id);
    const rest = ids.filter((x) => x !== id);
    router.replace(rest.length ? compareHref(rest) : '/packages/compare?ids=', { scroll: false });
  };

  if (!ids.length) {
    return (
      <>
        <PageHeader eyebrow="Compare" title="Compare packages" />
        <Card>
          <EmptyState
            title="No packages to compare yet"
            message={`Tap “+ Compare” on up to ${MAX_COMPARE} packages — from the same agency or different ones — then compare them side by side.`}
            action={
              <Link href="/packages" className="btn btn-primary mt-2">
                Browse packages
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  if (loading && !results) return <LoadingState label="Loading packages…" />;

  // null marks a package that is no longer available (unpublished, departed, or removed).
  const packages = (results || []).map((r) => (r.status === 'fulfilled' ? r.value : null));
  const cols = packages.length;
  const cells = (render) =>
    packages.map((p, i) =>
      p ? (
        render(p)
      ) : (
        <span key={i} className="text-secondary">
          —
        </span>
      ),
    );

  return (
    <>
      <Link href="/packages" className="small d-inline-block mb-3">
        ← All packages
      </Link>
      <PageHeader
        eyebrow="Compare"
        title={`Comparing ${cols} package${cols > 1 ? 's' : ''}`}
        subtitle="Prices are per person. Highlighted values are the best among these packages."
      />

      {cols < MAX_COMPARE && (
        <p className="small text-secondary">
          You can add {MAX_COMPARE - cols} more — <Link href="/packages">pick from the catalogue</Link>.
        </p>
      )}

      <Card className={styles.table} style={{ '--cols': cols }} role="table" aria-label="Package comparison">
        {/* Column headers: stay in view while scrolling down the comparison. */}
        <div className={`${styles.row} ${styles.head}`} role="row">
          <div className={styles.label} aria-hidden="true" />
          {packages.map((p, i) => (
            <div key={ids[i]} className={styles.cell} role="columnheader">
              <button type="button" className={styles.remove} onClick={() => removeColumn(ids[i])} aria-label="Remove from comparison">
                ×
              </button>
              {p ? (
                <>
                  <div className={`small text-secondary ${styles.clamp1}`}>{p.agency?.businessName}</div>
                  <Link href={`/packages/${p._id}`} className={`fw-semibold ${styles.clamp2}`}>
                    {p.title}
                  </Link>
                  <div className={styles.price}>{formatCurrency(p.pricePerPerson)}</div>
                </>
              ) : (
                <div className="small text-secondary pe-3">This package is no longer available.</div>
              )}
            </div>
          ))}
        </div>

        <Section title="Price & seats" />
        <Row label="Price per person" cells={cells((p) => <span className="text-nowrap">{formatCurrency(p.pricePerPerson)}</span>)} highlight={best(packages, (p) => p.pricePerPerson)} />
        <Row label="Room sharing" cells={cells((p) => ROOM_TYPE_LABELS[p.roomType])} />
        <Row
          label="Seats left"
          cells={cells((p) => (p.availableSeats ? `${p.availableSeats} of ${p.totalSeats}` : <span className="text-danger">Fully booked</span>))}
        />

        <Section title="Travel" />
        <Row label="Departure" cells={cells((p) => formatDate(p.departureDate))} />
        <Row label="Return" cells={cells((p) => formatDate(p.returnDate))} />
        <Row label="Duration" cells={cells((p) => `${p.durationDays} days`)} />
        <Row label="Departing from" cells={cells((p) => p.departureCity)} />

        <Section title="Makkah hotel" />
        <Row label="Hotel" cells={cells((p) => hotelCell(p.makkahHotel))} />
        <Row
          label="Distance from Haram"
          cells={cells((p) => <span className="text-nowrap">{formatDistance(p.makkahHotel.distanceMeters)}</span>)}
          highlight={best(packages, (p) => p.makkahHotel.distanceMeters)}
        />
        <Row label="Nights" cells={cells((p) => p.makkahHotel.nights)} />

        <Section title="Madinah hotel" />
        <Row label="Hotel" cells={cells((p) => hotelCell(p.madinahHotel))} />
        <Row
          label="Distance from Masjid an-Nabawi"
          cells={cells((p) => <span className="text-nowrap">{formatDistance(p.madinahHotel.distanceMeters)}</span>)}
          highlight={best(packages, (p) => p.madinahHotel.distanceMeters)}
        />
        <Row label="Nights" cells={cells((p) => p.madinahHotel.nights)} />

        <Section title="What’s included" />
        {INCLUSION_OPTIONS.map((o) => (
          <Row
            key={o.value}
            label={o.label}
            cells={cells((p) =>
              p.inclusions.includes(o.value) ? (
                <span className="text-success fw-semibold">✓<span className="visually-hidden"> Included</span></span>
              ) : (
                <span className="text-secondary">✕<span className="visually-hidden"> Not included</span></span>
              ),
            )}
          />
        ))}

        <Section title="Agency" />
        <Row label="Agency" cells={cells((p) => p.agency?.businessName)} />
        <Row label="Vendor type" cells={cells((p) => p.agency?.vendorTypeLabel)} />
        <Row label="Based in" cells={cells((p) => [p.agency?.city, p.agency?.province].filter(Boolean).join(', ') || '—')} />
        <Row
          label="Experience"
          cells={cells((p) => (p.agency?.experience !== undefined ? `${p.agency.experience} years` : '—'))}
          highlight={best(packages, (p) => p.agency?.experience, Math.max)}
        />

        <div className={`${styles.row} ${styles.foot}`} role="row">
          <div className={styles.label} aria-hidden="true" />
          {packages.map((p, i) => (
            <div key={ids[i]} className={styles.cell} role="cell">
              {p && (
                <Link href={`/packages/${p._id}`} className="btn btn-primary btn-sm w-100">
                  {p.availableSeats ? 'View & request seats' : 'View package'}
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Comparison />
    </Suspense>
  );
}
