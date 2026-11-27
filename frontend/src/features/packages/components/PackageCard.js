import Link from '@/components/common/IntentLink';
import CompareToggle from './CompareToggle';
import CloudImage from '@/components/common/CloudImage';
import Icon from '@/components/common/Icon';
import { ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDateRange, formatDistance } from '@/utils/format';
import styles from './PackageCard.module.scss';

export const Stars = ({ count }) => (
  <span className={styles.stars} role="img" aria-label={`${count} star hotel`}>
    {'★'.repeat(count)}
  </span>
);

// Few enough seats left to warn about: 5 or fewer, or under a fifth of the quota.
const isLow = (pkg) => pkg.availableSeats > 0 && (pkg.availableSeats <= 5 || pkg.availableSeats / pkg.totalSeats < 0.2);

/** Seat availability bar: share of the quota already booked. */
export function SeatAvailability({ pkg }) {
  const booked = pkg.totalSeats - pkg.availableSeats;
  const pct = pkg.totalSeats ? Math.round((booked / pkg.totalSeats) * 100) : 0;
  const low = isLow(pkg);
  return (
    <div>
      <div className="d-flex justify-content-between small mb-1">
        <span className={!pkg.availableSeats || low ? 'fw-semibold text-danger' : 'text-secondary'}>
          {!pkg.availableSeats
            ? 'Fully booked'
            : low
              ? `Only ${pkg.availableSeats} seat${pkg.availableSeats === 1 ? '' : 's'} left!`
              : `${pkg.availableSeats} seats available`}
        </span>
        <span className="text-secondary">
          {booked} / {pkg.totalSeats} booked
        </span>
      </div>
      <div className={`${styles.seatBar} ${low || !pkg.availableSeats ? styles.seatBarLow : ''}`} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * The package's cover photo (or a branded backdrop when it has none), with the departure
 * city, duration and agency name over it. Used at the top of catalogue cards.
 */
export function PackageCover({ pkg, sizes = '(min-width: 1200px) 400px, (min-width: 768px) 50vw, 100vw', showAgency = true }) {
  return (
    <div className={`${styles.cover} ${pkg.coverImage ? '' : styles.coverEmpty}`}>
      {pkg.coverImage && <CloudImage src={pkg.coverImage.url} alt="" fill sizes={sizes} className={styles.coverImg} />}
      <span className={styles.city}>
        <Icon name="plane" size={13} /> From {pkg.departureCity}
      </span>
      <span className={styles.duration}>{pkg.durationDays} days</span>
      {showAgency && pkg.agency && (
        <div className={styles.coverAgency}>
          <span className="text-truncate">{pkg.agency.businessName}</span>
          <Icon name="checkCircle" size={16} title="Verified agency" className={styles.verified} />
        </div>
      )}
    </div>
  );
}

function HotelRow({ city, hotel }) {
  return (
    <li className={styles.hotel}>
      <Icon name={city === 'Makkah' ? 'mosque' : 'hotel'} size={15} className={styles.hotelIcon} />
      <span className="text-truncate min-w-0">
        <span className="text-secondary">{city}:</span> {hotel.name}
      </span>
      <Stars count={hotel.stars} />
      <span className={styles.distance}>{formatDistance(hotel.distanceMeters)}</span>
    </li>
  );
}

/**
 * Catalogue card for a published package. `showAgency` is off on the agency's own page;
 * `titleAs` sets the title's heading level to fit the page outline.
 */
export default function PackageCard({ pkg, showAgency = true, titleAs: Title = 'h2' }) {
  return (
    <div className={`card ${styles.card}`}>
      <PackageCover pkg={pkg} showAgency={showAgency} />
      <div className={`card-body ${styles.body} d-flex flex-column`}>
        <Title className={`${styles.title} mb-1`}>
          <Link href={`/packages/${pkg._id}`} className="stretched-link text-body text-decoration-none">
            {pkg.title}
          </Link>
        </Title>
        <div className={`${styles.dates} mb-3`}>
          {formatDateRange(pkg.departureDate, pkg.returnDate)} · {pkg.durationDays} days
        </div>
        <ul className={`${styles.hotels} list-unstyled mb-3`}>
          <HotelRow city="Makkah" hotel={pkg.makkahHotel} />
          <HotelRow city="Madinah" hotel={pkg.madinahHotel} />
          <li className={styles.meta}>
            <span className="text-truncate">Departure: {pkg.departureCity}</span>
            <span className="text-nowrap">{ROOM_TYPE_LABELS[pkg.roomType]}</span>
          </li>
        </ul>
        <div className="mt-auto">
          <SeatAvailability pkg={pkg} />
          <div className={styles.priceRow}>
            <div>
              <div className={styles.price}>{formatCurrency(pkg.pricePerPerson)}</div>
              <div className={styles.perPerson}>per person</div>
            </div>
            <div className="d-flex align-items-center gap-2 ms-auto">
              <CompareToggle pkg={pkg} />
              <span className={`btn btn-sm ${styles.viewBtn}`}>View details</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
