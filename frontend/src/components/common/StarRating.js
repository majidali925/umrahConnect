'use client';

import { useId } from 'react';
import styles from './StarRating.module.scss';

/** Read-only star rating; fractional values (e.g. 4.3) partly fill the last star. */
export function StarRating({ value, size = 'md', className = '' }) {
  const pct = Math.max(0, Math.min(5, Number(value) || 0)) * 20;
  return (
    <span
      className={`${styles.stars} ${styles[size]} ${className}`}
      role="img"
      aria-label={`Rated ${Number(value || 0).toFixed(1).replace(/\.0$/, '')} out of 5`}
    >
      <span className={styles.empty} aria-hidden="true">
        ★★★★★
      </span>
      <span className={styles.filled} style={{ width: `${pct}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  );
}

const LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

/** Star picker built on radio buttons, so it works with the keyboard and screen readers. */
export function StarInput({ value, onChange, name = 'rating', invalid = false }) {
  const id = useId();
  return (
    <div>
      <div className={`${styles.input} ${invalid ? styles.invalid : ''}`} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} htmlFor={`${id}-${n}`} className={n <= value ? styles.on : ''} title={LABELS[n]}>
            <input
              type="radio"
              id={`${id}-${n}`}
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="visually-hidden"
            />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">
              {n} star{n > 1 ? 's' : ''} — {LABELS[n]}
            </span>
          </label>
        ))}
      </div>
      <div className="small text-secondary mt-1" aria-live="polite">
        {value ? LABELS[value] : 'Choose a rating'}
      </div>
    </div>
  );
}
