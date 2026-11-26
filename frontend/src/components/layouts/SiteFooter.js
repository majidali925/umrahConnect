import Link from '@/components/common/IntentLink';
import BrandLogo from '@/components/common/BrandLogo';
import CurrentYear from '@/components/common/CurrentYear';
import Icon from '@/components/common/Icon';
import styles from './SiteFooter.module.scss';

const COLUMNS = [
  {
    title: 'Pilgrims',
    links: [
      { href: '/packages', label: 'Browse Umrah packages' },
      { href: '/packages/compare', label: 'Compare packages' },
      { href: '/#faq', label: 'Umrah booking FAQ' },
      { href: '/register', label: 'Create an account' },
    ],
  },
  {
    title: 'Verification',
    links: [
      { href: '/#verification', label: 'How agencies are verified' },
      { href: '/#how-it-works', label: 'How booking works' },
    ],
  },
  {
    title: 'Agencies',
    links: [
      { href: '/register/vendor', label: 'Register your agency' },
      { href: '/login', label: 'Agency sign in' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className={`${styles.footer} mt-auto`}>
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-5">
            <BrandLogo size="sm" />
            <p className={`${styles.about} mt-3`}>
              Compare Umrah packages from verified Umrah travel agencies across Pakistan — prices, hotels near the Haram
              and what is included, in one place.
            </p>
            <p className={styles.guarantee}>
              <Icon name="shield" size={15} /> Every listed agency is verified by our team
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="col-6 col-md-4 col-lg-2">
              <h2 className={styles.heading}>{col.title}</h2>
              <ul className="list-unstyled mb-0">
                {col.links.map((l) => (
                  <li key={l.href} className="mb-2">
                    <Link href={l.href} className={styles.link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className={styles.rule} />
        <p className={styles.copy}>
          © <CurrentYear /> UmrahConnect. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
