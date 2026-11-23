'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Collapse, Navbar, NavbarToggler, Nav, NavItem, Container } from 'reactstrap';
import BrandLogo from '@/components/common/BrandLogo';
import UserMenu from '@/components/common/UserMenu';
import { roleLabelFor } from '@/components/common/accountMenu';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { homeRouteFor } from '@/utils/routes';
import styles from './SiteHeader.module.scss';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isResolving, user, agency } = useAuth();
  const logout = useLogout();

  return (
    <header className={styles.header}>
      <Navbar expand="md" container={false} className="py-0">
        <Container className="d-flex align-items-center justify-content-between" style={{ minHeight: 68 }}>
          <BrandLogo />
          <NavbarToggler onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" />
          <Collapse isOpen={open} navbar className="flex-grow-0">
            <Nav navbar className="align-items-md-center gap-md-2 py-3 py-md-0">
              <NavItem>
                <Link className="nav-link" href="/packages" onClick={() => setOpen(false)}>
                  Packages
                </Link>
              </NavItem>
              <NavItem>
                <Link className="nav-link" href="/#how-it-works" onClick={() => setOpen(false)}>
                  How it works
                </Link>
              </NavItem>
              <NavItem>
                <Link className="nav-link" href="/#for-agencies" onClick={() => setOpen(false)}>
                  For agencies
                </Link>
              </NavItem>
              {!isResolving && !isAuthenticated && (
                <>
                  <NavItem>
                    <Link className="nav-link fw-semibold" href="/login">
                      Log in
                    </Link>
                  </NavItem>
                  <NavItem className="d-flex gap-2 mt-2 mt-md-0">
                    <Link className="btn btn-primary" href="/register">
                      Create account
                    </Link>
                  </NavItem>
                </>
              )}
              {isAuthenticated && (
                <NavItem className="mt-2 mt-md-0 ms-md-1">
                  <UserMenu
                    name={user?.fullName}
                    email={user?.email}
                    roleLabel={roleLabelFor(user, agency)}
                    items={[{ href: homeRouteFor(user, agency), label: 'My dashboard', icon: 'home' }]}
                    onLogout={logout}
                  />
                </NavItem>
              )}
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
    </header>
  );
}
