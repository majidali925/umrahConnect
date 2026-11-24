import Link from 'next/link';
import { Card, CardBody } from 'reactstrap';
import CompareToggle from './CompareToggle';
import CloudImage from '@/components/common/CloudImage';
import { ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDateRange, formatDistance } from '@/utils/format';
import styles from './PackageCard.module.scss';

export const Stars = ({ count }) => (
  <span className={styles.stars} aria-label={`${count} star hotel`}>
    {'★'.repeat(count)}
  </span>
);

/** Seat availability bar: share of the quota already booked. */
export function SeatAvailability({ pkg }) {
  const booked = pkg.totalSeats - pkg.availableSeats;
  const pct = pkg.totalSeats ? Math.round((booked / pkg.totalSeats) * 100) : 0;
  return (
    <div>
      <div className="d-flex justify-content-between small mb-1">
        <span className={pkg.availableSeats ? 'fw-semibold' : 'fw-semibold text-danger'}>
          {pkg.availableSeats ? `${pkg.availableSeats} seat(s) left` : 'Fully booked'}
        </span>
        <span className="text-secondary">of {pkg.totalSeats}</span>
      </div>
      <div className={styles.seatBar} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * The package's cover photo (or a branded backdrop when it has none), with the agency name
 * over it. Used at the top of catalogue cards.
 */
export function PackageCover({ pkg, sizes = '(min-width: 1200px) 400px, (min-width: 768px) 50vw, 100vw', showAgency = true }) {
  return (
    <div className={`${styles.cover} ${pkg.coverImage ? '' : styles.coverEmpty}`}>
      {pkg.coverImage && <CloudImage src={pkg.coverImage.url} alt="" fill sizes={sizes} className={styles.coverImg} />}
      <span className={styles.duration}>{pkg.durationDays} days</span>
      {showAgency && pkg.agency && (
        <div className={styles.coverAgency}>
          <span className="text-truncate">{pkg.agency.businessName}</span>
          <span className={styles.verified}>✓ Verified</span>
        </div>
      )}
    </div>
  );
}

/** Catalogue card for a published package. `showAgency` is off on the agency's own page. */
export default function PackageCard({ pkg, showAgency = true }) {
  return (
    <Card className={styles.card}>
      <PackageCover pkg={pkg} showAgency={showAgency} />
      <CardBody className="p-4 d-flex flex-column">
        <h2 className="h5 mb-2">
          <Link href={`/packages/${pkg._id}`} className="stretched-link text-body text-decoration-none">
            {pkg.title}
          </Link>
        </h2>
        <div className={`${styles.dates} mb-3`}>
          {formatDateRange(pkg.departureDate, pkg.returnDate)} · {pkg.durationDays} days
        </div>
        <ul className="list-unstyled small mb-3">
          <li className="mb-1">
            <span className="text-secondary">Makkah:</span> {pkg.makkahHotel.name} <Stars count={pkg.makkahHotel.stars} />{' '}
            <span className="text-secondary text-nowrap">· {formatDistance(pkg.makkahHotel.distanceMeters)}</span>
          </li>
          <li className="mb-1">
            <span className="text-secondary">Madinah:</span> {pkg.madinahHotel.name} <Stars count={pkg.madinahHotel.stars} />{' '}
            <span className="text-secondary text-nowrap">· {formatDistance(pkg.madinahHotel.distanceMeters)}</span>
          </li>
          <li>
            <span className="text-secondary">From:</span> {pkg.departureCity} · {ROOM_TYPE_LABELS[pkg.roomType]}
          </li>
        </ul>
        <div className="mt-auto">
          <SeatAvailability pkg={pkg} />
          <div className="d-flex align-items-end justify-content-between mt-3">
            <div>
              <div className={styles.price}>{formatCurrency(pkg.pricePerPerson)}</div>
              <div className="small text-secondary">per person</div>
            </div>
            <div className="d-flex flex-column align-items-end gap-2">
              <CompareToggle pkg={pkg} />
              <span className="btn btn-sm btn-outline-primary">View details</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
