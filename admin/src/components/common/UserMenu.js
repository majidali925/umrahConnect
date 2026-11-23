'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { initials } from '@/utils/format';
import styles from './UserMenu.module.scss';

// Small stroke icons (24×24 grid), drawn in the current text colour.
const ICON_PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  package: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0L12 12m0 0 9-4.5M12 12v9',
  file: 'M14 3H6v18h12V7l-4-4Zm0 0v4h4M9 13h6M9 17h6',
  building: 'M4 21V5l8-2v18M12 8h8v13M8 9h.01M8 13h.01M8 17h.01M16 12h.01M16 16h.01M2 21h20',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
};

function Icon({ name }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name] || ICON_PATHS.home} />
    </svg>
  );
}

/**
 * Avatar button that opens the account menu.
 * items: [{ href, label, icon }] · roleLabel: shown as a badge under the name.
 * The menu is placed with CSS (right-aligned under the button; in-flow inside a collapsed
 * mobile navbar) rather than Popper, which left it unpositioned.
 */
export default function UserMenu({ name, email, roleLabel, items = [], onLogout }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dropdown isOpen={open} toggle={() => setOpen((o) => !o)} inNavbar className={styles.wrap}>
      <DropdownToggle tag="button" type="button" className={styles.trigger} aria-label="Account menu">
        <span className={styles.avatar} aria-hidden="true">
          {initials(name) || '?'}
        </span>
        <span className={styles.who}>
          <span className={styles.name}>{name}</span>
          {roleLabel && roleLabel !== name && <span className={styles.role}>{roleLabel}</span>}
        </span>
        <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </DropdownToggle>

      <DropdownMenu end className={styles.menu}>
        <div className={styles.header}>
          <span className={`${styles.avatar} ${styles.avatarLg}`} aria-hidden="true">
            {initials(name) || '?'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className={styles.headerName}>{name}</div>
            {email && <div className={styles.email}>{email}</div>}
            {roleLabel && <span className={styles.badge}>{roleLabel}</span>}
          </div>
        </div>

        {items.length > 0 && (
          <div className={styles.section}>
            {items.map((item) => (
              <DropdownItem key={item.href} tag={Link} href={item.href} className={styles.item} onClick={close}>
                <Icon name={item.icon} />
                {item.label}
              </DropdownItem>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <DropdownItem
            className={`${styles.item} ${styles.logout}`}
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <Icon name="logout" />
            Log out
          </DropdownItem>
        </div>
      </DropdownMenu>
    </Dropdown>
  );
}
