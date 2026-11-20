// The 1200×630 card shown when a link is shared on WhatsApp, Facebook, X, etc.
// Rendered by next/og (Satori): inline styles and flexbox only.

export const SHARE_SIZE = { width: 1200, height: 630 };

const GREEN = '#0b5d3b';
const GOLD = '#c9a227';
const LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${GREEN}"/><path d="M18 48V30c0-7.7 6.3-14 14-14s14 6.3 14 14v18" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/><rect x="26" y="34" width="12" height="14" rx="2" fill="#fff"/></svg>`,
  );

/** `eyebrow` small line on top, `title` big, `facts` up to 3 [label, value] pairs, `footer` bottom line. */
export default function ShareCard({ eyebrow, title, facts = [], footer }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: `linear-gradient(135deg, ${GREEN} 0%, #07402a 100%)`,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={LOGO} width={64} height={64} style={{ border: '2px solid rgba(255,255,255,0.35)', borderRadius: 16 }} />
        <div style={{ fontSize: 34, fontWeight: 700 }}>UmrahConnect</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {eyebrow && <div style={{ fontSize: 28, color: GOLD, fontWeight: 700 }}>{eyebrow}</div>}
        <div style={{ fontSize: title.length > 60 ? 54 : 64, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {facts.length > 0 && (
          <div style={{ display: 'flex', gap: 56 }}>
            {facts.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>{label}</div>
                <div style={{ fontSize: 34, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        {footer && <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.8)' }}>{footer}</div>}
      </div>
    </div>
  );
}
