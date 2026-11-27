'use client';

import Link from '@/components/common/IntentLink';
import Icon from '@/components/common/Icon';
import { useCompare, MAX_COMPARE } from '@/features/packages/compareStore';
import styles from '../home.module.scss';

/** Nudge to compare packages side by side, showing how many the visitor has already picked. */
export default function CompareBanner() {
  const { items } = useCompare();
  const ready = items.length >= 2;

  return (
    <div className={styles.compareBanner}>
      <span className={styles.compareIcon}>
        <Icon name="compare" size={22} />
      </span>
      <div className="flex-grow-1 min-w-0">
        <h2 className={styles.compareTitle}>Not sure between walking distance and shuttle hotels?</h2>
        <p className="mb-0 text-secondary small">
          Pick up to {MAX_COMPARE} packages with “+ Compare” and see hotels, distance from the Haram, room sharing, dates
          and inclusions side by side.
        </p>
      </div>
      <div className="d-flex align-items-center gap-3 flex-shrink-0">
        <div
          className={styles.slots}
          role="img"
          aria-label={`${items.length} of ${MAX_COMPARE} packages picked`}
        >
          {Array.from({ length: MAX_COMPARE }, (_, i) => (
            <span key={i} className={i < items.length ? styles.slotFilled : styles.slot}>
              {i < items.length ? i + 1 : <Icon name="plus" size={12} />}
            </span>
          ))}
        </div>
        <Link href={ready ? '/packages/compare' : '/packages'} className={`btn ${styles.copperBtn}`}>
          {ready ? 'Compare packages' : 'Pick packages'}
        </Link>
      </div>
    </div>
  );
}
