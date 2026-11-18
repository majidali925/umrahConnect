import BrandLogo from '@/components/common/BrandLogo';
import CurrentYear from '@/components/common/CurrentYear';
import styles from './AuthShell.module.scss';

/** Split-screen layout for authentication pages. */
export default function AuthShell({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <BrandLogo light />
        <div className={styles.pitch}>
          <p className={styles.eyebrow}>Trusted Umrah marketplace</p>
          <h2 className={styles.headline}>Plan your sacred journey with verified agencies.</h2>
          <ul className={styles.points}>
            <li>Every agency and operator is reviewed by our verification team</li>
            <li>Licensing and identity checks shown transparently</li>
            <li>Built for pilgrims across Pakistan</li>
          </ul>
        </div>
        <p className={styles.footnote}>© <CurrentYear /> UmrahConnect</p>
      </aside>
      <main className={styles.main}>
        <div className={styles.mobileLogo}>
          <BrandLogo />
        </div>
        <div className={styles.panel}>{children}</div>
      </main>
    </div>
  );
}
