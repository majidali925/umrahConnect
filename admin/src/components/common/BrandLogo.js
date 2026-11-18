import Link from 'next/link';
import styles from './BrandLogo.module.scss';

export default function BrandLogo({ href = '/', light = false, size = 'md' }) {
  return (
    <Link href={href} className={`${styles.logo} ${light ? styles.light : ''} ${styles[size]}`} aria-label="UmrahConnect home">
      <svg className={styles.mark} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path
          d="M18 48V30c0-7.7 6.3-14 14-14s14 6.3 14 14v18"
          fill="none"
          stroke="#c9a227"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect x="26" y="34" width="12" height="14" rx="2" fill="#fff" />
      </svg>
      <span className={styles.word}>
        Umrah<span className={styles.accent}>Connect</span>
      </span>
    </Link>
  );
}
