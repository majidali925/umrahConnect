'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import BrandLogo from '@/components/common/BrandLogo';
import Icon from '@/components/common/Icon';
import IntentLink from '@/components/common/IntentLink';
import { roleLabelFor } from '@/components/common/accountMenu';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { useCompare } from '@/features/packages/compareStore';
import { homeRouteFor } from '@/utils/routes';
import styles from './SiteHeader.module.scss';

// Only signed-in visitors see the account menu, so its dropdown code loads only for them.
const UserMenu = dynamic(() => import('@/components/common/UserMenu'), { ssr: false });

const LINKS = [
  { href: '/packages', label: 'Packages' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#verification', label: 'Agency verification' },
];

/**
 * Public site header. Plain Bootstrap navbar markup (no component library) so it adds as
 * little script as possible to every public page; the menu collapses below the lg breakpoint.
 */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isResolving, user, agency } = useAuth();
  const { items: compareItems } = useCompare();
  const logout = useLogout();
  const close = () => setOpen(false);

  return (
    <header className={styles.header}>
      <nav className="navbar navbar-expand-lg py-0" aria-label="Main">
        <div className="container d-flex align-items-center justify-content-between gap-3" style={{ minHeight: 68 }}>
          <BrandLogo />

          <div className="d-flex align-items-center gap-2 d-lg-none">
            {!isResolving && !isAuthenticated && (
              <IntentLink href="/login" className={styles.avatarBtn} aria-label="Sign in">
                <Icon name="user" size={18} />
              </IntentLink>
            )}
            <button
              type="button"
              className={`navbar-toggler ${styles.toggler}`}
              onClick={() => setOpen((o) => !o)}
              aria-controls="site-nav"
              aria-expanded={open}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
          </div>

          <div id="site-nav" className={`collapse navbar-collapse flex-grow-0 ${open ? 'show' : ''}`}>
            <ul className="navbar-nav align-items-lg-center gap-lg-1 py-3 py-lg-0">
              {LINKS.map((link) => (
                <li key={link.href} className="nav-item">
                  <IntentLink className="nav-link" href={link.href} onClick={close}>
                    {link.label}
                  </IntentLink>
                </li>
              ))}
              <li className="nav-item">
                <IntentLink className="nav-link d-inline-flex align-items-center gap-2" href="/packages/compare" onClick={close}>
                  Compare
                  {compareItems.length > 0 && (
                    <span className={styles.count} aria-label={`${compareItems.length} selected`}>
                      {compareItems.length}
                    </span>
                  )}
                </IntentLink>
              </li>
              <li className="nav-item">
                <IntentLink className="nav-link" href="/#for-agencies" onClick={close}>
                  For agencies
                </IntentLink>
              </li>

              {!isResolving && !isAuthenticated && (
                <>
                  <li className="nav-item ms-lg-2">
                    <IntentLink className="nav-link fw-semibold" href="/login" onClick={close}>
                      Sign in
                    </IntentLink>
                  </li>
                  <li className="nav-item mt-2 mt-lg-0">
                    <IntentLink className={`btn ${styles.portalBtn}`} href="/register/vendor" onClick={close}>
                      List your agency <Icon name="arrowRight" size={16} />
                    </IntentLink>
                  </li>
                  <li className="nav-item d-none d-lg-block">
                    <IntentLink href="/register" className={styles.avatarBtn} aria-label="Create a free account" title="Create a free account">
                      <Icon name="user" size={18} />
                    </IntentLink>
                  </li>
                </>
              )}
              {isAuthenticated && (
                <li className="nav-item mt-2 mt-lg-0 ms-lg-1">
                  <UserMenu
                    name={user?.fullName}
                    email={user?.email}
                    roleLabel={roleLabelFor(user, agency)}
                    items={[{ href: homeRouteFor(user, agency), label: 'My dashboard', icon: 'home' }]}
                    onLogout={logout}
                  />
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
