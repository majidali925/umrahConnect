import Image from 'next/image';
import BrandLogo from '@/components/common/BrandLogo';
import CloudImage from '@/components/common/CloudImage';
import CurrentYear from '@/components/common/CurrentYear';
import styles from './AuthShell.module.scss';

/** Split-screen layout for authentication pages. */
export default function AuthShell({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        {/* Makkah and Madinah photos, slowly cross-fading */}
        <CloudImage
          src="https://res.cloudinary.com/o8uceeey/image/upload/v1795500176/makkah.jpg"
          alt="The Kaaba at Masjid al-Haram, Makkah, framed by an arch at sunset"
          fill
          priority
          sizes="(min-width: 992px) 42vw, 0px"
          className={`${styles.photo} ${styles.photoMakkah}`}
        />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.logo}>
          <BrandLogo light />
        </div>
        <div className={styles.pitch}>
          <p className={styles.eyebrow}>Trusted Umrah marketplace</p>
          <h2 className={styles.headline}>Plan your sacred journey with verified agencies.</h2>
          <ul className={styles.points}>
            <li>Every agency is reviewed by our verification team</li>
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
