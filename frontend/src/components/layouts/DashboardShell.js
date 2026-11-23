'use client';

import { useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from 'reactstrap';
import BrandLogo from '@/components/common/BrandLogo';
import UserMenu from '@/components/common/UserMenu';
import { roleLabelFor } from '@/components/common/accountMenu';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import styles from './DashboardShell.module.scss';

/**
 * Sidebar + top bar layout for the vendor area.
 * navItems: [{ href, label, match?: (pathname) => boolean }]
 */
export default function DashboardShell({ navItems, areaLabel, children }) {
  const pathname = usePathname();
  const { user, agency } = useAuth();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu when this route is hidden by Activity.
  useLayoutEffect(() => () => setMenuOpen(false), []);

  const isActive = (item) => (item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <BrandLogo light size="sm" />
        </div>
        {areaLabel && <div className={styles.area}>{areaLabel}</div>}
        <nav className={styles.nav} aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${isActive(item) ? styles.active : ''}`}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      {menuOpen && <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <div className={styles.body}>
        <header className={styles.topbar}>
          <Button color="light" className={`border ${styles.menuButton}`} onClick={() => setMenuOpen(true)} aria-label="Open menu">
            ☰
          </Button>
          <div className="d-lg-none">
            <BrandLogo size="sm" />
          </div>
          <div className="ms-auto">
            <UserMenu name={user?.fullName} email={user?.email} roleLabel={roleLabelFor(user, agency)} onLogout={logout} />
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
