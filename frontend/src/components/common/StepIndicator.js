'use client';

import styles from './StepIndicator.module.scss';

/** Horizontal wizard progress. Completed steps are clickable when `onSelect` is given. */
export default function StepIndicator({ steps, current, completed = [], onSelect }) {
  return (
    <ol className={styles.steps} aria-label="Progress">
      {steps.map((label, index) => {
        const step = index + 1;
        const isCurrent = step === current;
        const isDone = completed.includes(step) && !isCurrent;
        const clickable = onSelect && (isDone || step < current);
        return (
          <li key={label} className={`${styles.step} ${isCurrent ? styles.current : ''} ${isDone ? styles.done : ''}`}>
            <button
              type="button"
              className={styles.button}
              onClick={() => clickable && onSelect(step)}
              disabled={!clickable}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className={styles.circle}>{isDone ? '✓' : step}</span>
              <span className={styles.label}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
