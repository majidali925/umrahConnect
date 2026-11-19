'use client';

import Link from 'next/link';
import { Button } from 'reactstrap';
import { useCompare, compareHref, MAX_COMPARE } from '../compareStore';
import styles from './CompareTray.module.scss';

/** Bar fixed to the bottom of the screen listing the packages picked for comparison. */
export default function CompareTray() {
  const { items, remove, clear } = useCompare();
  if (!items.length) return null;

  const canCompare = items.length >= 2;

  return (
    <>
      {/* Keeps the bar from covering the end of the page. */}
      <div className={styles.spacer} aria-hidden="true" />
      <section className={styles.tray} aria-label="Packages to compare">
        <div className="container d-flex flex-column flex-md-row align-items-md-center gap-2 gap-md-3">
          <div className="d-flex d-md-block justify-content-between align-items-baseline flex-shrink-0">
            <div className="fw-semibold small">Compare packages</div>
            <div className="small text-secondary">
              {items.length} of {MAX_COMPARE} selected
            </div>
          </div>
          <ul className={`list-unstyled mb-0 ${styles.items}`}>
            {items.map((x) => (
              <li key={x._id} className={styles.item}>
                <span className="text-truncate">
                  <span className="fw-semibold">{x.title}</span>
                  {x.agencyName && <span className="text-secondary d-none d-sm-inline"> · {x.agencyName}</span>}
                </span>
                <button type="button" className={styles.remove} onClick={() => remove(x._id)} aria-label={`Remove ${x.title} from comparison`}>
                  ×
                </button>
              </li>
            ))}
            {Array.from({ length: MAX_COMPARE - items.length }, (_, i) => (
              <li key={`slot-${i}`} className={`${styles.item} ${styles.slot} d-none d-md-flex`}>
                Add a package
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <Button color="link" size="sm" className="text-secondary px-1" onClick={clear}>
              Clear
            </Button>
            {canCompare ? (
              <Link href={compareHref(items.map((x) => x._id))} className="btn btn-primary flex-grow-1">
                Compare {items.length} packages →
              </Link>
            ) : (
              <div className="d-flex flex-column align-items-stretch flex-grow-1">
                <Button color="primary" disabled aria-describedby="compare-hint">
                  Compare ({items.length}/{MAX_COMPARE})
                </Button>
                <span id="compare-hint" className="small text-secondary text-center mt-1">
                  Add at least one more package
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
