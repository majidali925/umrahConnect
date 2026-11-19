import Link from 'next/link';
import { Card, CardBody } from 'reactstrap';
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

/** Catalogue card for a published package. */
export default function PackageCard({ pkg }) {
  return (
    <Card className={styles.card}>
      <CardBody className="p-4 d-flex flex-column">
        <div className="small text-secondary mb-1">
          {pkg.agency?.businessName}
          {pkg.agency && <span className="badge rounded-pill badge-soft badge-soft-success ms-2">Verified</span>}
        </div>
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
            <span className="btn btn-sm btn-outline-primary">View details</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
