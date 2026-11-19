'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Collapse, Navbar, NavbarToggler, Nav, NavItem, Container, Button } from 'reactstrap';
import BrandLogo from '@/components/common/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { homeRouteFor } from '@/utils/routes';
import { useCompare, compareHref } from '@/features/packages/compareStore';
import styles from './SiteHeader.module.scss';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isResolving, user, agency } = useAuth();
  const logout = useLogout();
  const { items: comparing } = useCompare();
  // Phones only: on desktop the compare bar and package pages already link to the comparison.
  const compareLink = comparing.length ? (
    <Link
      href={compareHref(comparing.map((x) => x._id))}
      className={`btn btn-sm btn-outline-primary ${styles.compare}`}
      aria-label={`Compare packages (${comparing.length} selected)`}
    >
      <span className="d-none d-sm-inline">Compare</span>
      <span className="d-sm-none" aria-hidden="true">
        ⇄
      </span>
      <span className="badge rounded-pill text-bg-primary ms-1">{comparing.length}</span>
    </Link>
  ) : null;

  return (
    <header className={styles.header}>
      <Navbar expand="md" container={false} className="py-0">
        <Container className="d-flex align-items-center justify-content-between" style={{ minHeight: 68 }}>
          <BrandLogo />
          <div className="d-flex align-items-center d-md-none ms-auto me-2">{compareLink}</div>
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
                <>
                  <NavItem>
                    <Link className="btn btn-primary" href={homeRouteFor(user, agency)}>
                      My dashboard
                    </Link>
                  </NavItem>
                  <NavItem>
                    <Button color="link" className="nav-link" onClick={logout}>
                      Log out
                    </Button>
                  </NavItem>
                </>
              )}
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
    </header>
  );
}
