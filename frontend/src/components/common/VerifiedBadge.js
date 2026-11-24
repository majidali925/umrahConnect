import styles from './VerifiedBadge.module.scss';

// Scalloped seal: a disc ringed by 12 small circles, filled as one shape.
const LOBES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  return { cx: 12 + 8.4 * Math.sin(angle), cy: 12 - 8.4 * Math.cos(angle) };
});

/** Green verified seal; "Verified agency" appears on hover or keyboard focus. */
export default function VerifiedBadge({ label = 'Verified agency', size = 24, className = '' }) {
  return (
    <span className={`${styles.badge} ${className}`} tabIndex={0} role="img" aria-label={label} data-tooltip={label}>
      <svg width={size} height={size} viewBox="-1 -1 26 26" aria-hidden="true" focusable="false">
        {/* White rim, so the seal stands out on green backgrounds and photos. */}
        <g className={styles.rim}>
          <circle cx="12" cy="12" r="9.8" />
          {LOBES.map(({ cx, cy }, i) => (
            <circle key={i} cx={cx.toFixed(2)} cy={cy.toFixed(2)} r="3.9" />
          ))}
        </g>
        <g className={styles.seal}>
          <circle cx="12" cy="12" r="8.6" />
          {LOBES.map(({ cx, cy }, i) => (
            <circle key={i} cx={cx.toFixed(2)} cy={cy.toFixed(2)} r="2.7" />
          ))}
        </g>
        <path d="M7.8 12.3l2.8 2.8 5.6-5.8" className={styles.check} />
      </svg>
    </span>
  );
}
