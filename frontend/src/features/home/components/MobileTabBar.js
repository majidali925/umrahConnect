'use client';

import Link from '@/components/common/IntentLink';
import Icon from '@/components/common/Icon';
import { useCompare } from '@/features/packages/compareStore';
import styles from '../home.module.scss';

/** Bottom navigation on phones (home page only; signed-in visitors are sent to their dashboard). */
export default function MobileTabBar() {
  const { items } = useCompare();
  const tabs = [
    { href: '/', label: 'Explore', icon: 'compass', active: true },
    { href: '/packages', label: 'Packages', icon: 'package' },
    { href: '/packages/compare', label: 'Compare', icon: 'compare', badge: items.length },
    { href: '/#for-agencies', label: 'Agencies', icon: 'badge' },
    { href: '/login', label: 'Sign in', icon: 'user' },
  ];

  return (
    <nav className={styles.tabBar} aria-label="Quick links">
      {tabs.map((t) => (
        <Link key={t.label} href={t.href} className={`${styles.tab} ${t.active ? styles.tabActive : ''}`} aria-current={t.active ? 'page' : undefined}>
          <span className="position-relative">
            <Icon name={t.icon} size={21} />
            {t.badge > 0 && <span className={styles.tabBadge}>{t.badge}</span>}
          </span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
