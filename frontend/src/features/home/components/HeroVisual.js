import CloudImage from '@/components/common/CloudImage';
import Icon from '@/components/common/Icon';
import styles from '../home.module.scss';

// Photo by Hushaan on Unsplash (Unsplash License), stored in the project's Cloudinary folder as site/hero-kaaba.
const HERO_IMAGE = 'https://res.cloudinary.com/o8uceeey/image/upload/v1795602324/umrahconnect/site/hero-kaaba.jpg';

/** Photo of the Kaaba with the verification promise over it. */
export default function HeroVisual() {
  return (
    <div className={styles.visual}>
      <CloudImage
        src={HERO_IMAGE}
        alt="The Kaaba in Masjid al-Haram, Makkah, at sunset, seen through an archway"
        fill
        preload
        fetchPriority="high"
        sizes="(min-width: 992px) 460px, 100vw"
        className={styles.visualImg}
      />

      <div className={styles.visualBadge}>
        <span className={styles.visualIcon}>
          <Icon name="shield" size={18} />
        </span>
        <span className="min-w-0">
          <strong className="d-block">Every agency verified</strong>
          <span className={styles.visualSub}>Identity, business registration & licensing checked</span>
        </span>
        <span className={`${styles.livePill} d-none d-sm-inline-flex`}>Verified</span>
      </div>
    </div>
  );
}
