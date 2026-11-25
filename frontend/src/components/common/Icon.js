// Small stroke icons on a 24×24 grid, drawn in the current text colour.
const PATHS = {
  plane: 'M10.5 13.5 3 11l1.5-1.5 7 1 4-4.5a2 2 0 0 1 3 3l-4.5 4 1 7L13.5 21 11 13.5M3 21h7',
  calendar: 'M4 6h16v14H4V6Zm0 4h16M8 3v4m8-4v4',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4',
  shieldPlain: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9 3 3 5-6',
  check: 'm5 12 4 4L19 6',
  checks: 'm2 12 4 4 9-9m-3 9 1 1 9-9',
  building: 'M4 21V5l8-2v18M12 8h8v13M8 9h.01M8 13h.01M8 17h.01M16 12h.01M16 16h.01M2 21h20',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4h.01',
  compare: 'M4 8h13m0 0-4-4m4 4-4 4M20 16H7m0 0 4-4m-4 4 4 4',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  lock: 'M6 11h12v10H6V11Zm2 0V7a4 4 0 0 1 8 0v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  package: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0L12 12m0 0 9-4.5M12 12v9',
  badge: 'M12 3 14.4 5l3.1-.3.6 3.1 2.7 1.6-1.3 2.9 1.3 2.9-2.7 1.6-.6 3.1-3.1-.3L12 21l-2.4-2-3.1.3-.6-3.1-2.7-1.6L4.5 12 3.2 9.1l2.7-1.6.6-3.1 3.1.3L12 3Zm-3 9 2 2 4-4',
  hotel: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01',
  mosque: 'M4 21V11m16 10V11M2 21h20M7 21v-6a5 5 0 0 1 10 0v6M12 6a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3Zm0-3v3M4 11V7m16 4V7',
  filter: 'M4 6h16M7 12h10M10 18h4',
  plus: 'M12 5v14M5 12h14',
};

/** Inline stroke icon. `size` is in pixels; the icon is decorative unless `title` is given. */
export default function Icon({ name, size = 18, strokeWidth = 1.8, className, title }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      style={{ flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name] || PATHS.checkCircle} />
    </svg>
  );
}
