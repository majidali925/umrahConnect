'use client';

import { Button, Spinner } from 'reactstrap';
import styles from './States.module.scss';

export function LoadingState({ label = 'Loading…', compact = false }) {
  return (
    <div className={`${styles.state} ${compact ? styles.compact : ''}`} role="status" aria-live="polite">
      <Spinner color="primary" />
      <p className={styles.text}>{label}</p>
    </div>
  );
}

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className={styles.fullPage}>
      <LoadingState label={label} />
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className={styles.state} role="alert">
      <div className={`${styles.icon} ${styles.error}`} aria-hidden="true">!</div>
      <h3 className={styles.title}>{title}</h3>
      {message && <p className={styles.text}>{message}</p>}
      {onRetry && (
        <Button color="primary" outline onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className={styles.state}>
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 7h18M3 12h18M3 17h10" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className={styles.title}>{title}</h3>
      {message && <p className={styles.text}>{message}</p>}
      {action}
    </div>
  );
}
