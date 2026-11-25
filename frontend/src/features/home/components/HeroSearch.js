import Link from '@/components/common/IntentLink';
import Icon from '@/components/common/Icon';
import { PRICE_OPTIONS, SORT_OPTIONS } from '@/features/packages/browseQuery';
import styles from '../home.module.scss';

const monthLabel = new Intl.DateTimeFormat('en-PK', { month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });

/**
 * This month and the next 11, as { value: 'YYYY-MM-01', label: 'Dec 2026' } (the catalogue's
 * "departing after" date). Reads the clock, so call it only while rendering per request.
 */
export function upcomingMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1, 12));
    return { value: d.toISOString().slice(0, 10), label: monthLabel.format(d) };
  });
}

function Field({ id, icon, label, className = '', children }) {
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.fieldLabel}>
        <Icon name={icon} size={14} /> {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Package search on the home page: a plain GET form to /packages using the same filters as the
 * catalogue, so it works before (and without) JavaScript. Phones show city and month only,
 * with a link to the full filter list.
 */
export default function HeroSearch({ cities = [], months = [], total }) {
  return (
    <form action="/packages" method="get" className={styles.search} role="search" aria-label="Find Umrah packages">
      <div className={styles.searchGrid}>
        <Field id="hero-city" icon="plane" label="Departure city">
          <select id="hero-city" name="departureCity" className="form-select" defaultValue="">
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field id="hero-from" icon="calendar" label="Travel month">
          <select id="hero-from" name="from" className="form-select" defaultValue="">
            <option value="">Any time</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                From {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="hero-price" icon="tag" label="Budget per person" className="d-none d-md-block">
          <select id="hero-price" name="maxPrice" className="form-select" defaultValue="">
            <option value="">Any budget</option>
            {PRICE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                Up to Rs {p.toLocaleString('en-PK')}
              </option>
            ))}
          </select>
        </Field>
        <Field id="hero-sort" icon="clock" label="Sort by" className="d-none d-md-block">
          <select id="hero-sort" name="sort" className="form-select" defaultValue="departure">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button type="submit" className={`btn flex-grow-1 ${styles.searchBtn}`}>
          <Icon name="search" size={17} />
          <span>
            Find {total ? `${total} ` : ''}
            <span className="d-none d-sm-inline">verified </span>
            package{total === 1 ? '' : 's'}
          </span>
        </button>
        <Link href="/packages" className={`btn d-md-none ${styles.filterBtn}`} aria-label="All filters">
          <Icon name="filter" size={18} />
        </Link>
      </div>
    </form>
  );
}
