export default function PageHeader({ title, subtitle, eyebrow, actions }) {
  return (
    <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
      <div className="min-w-0">
        {eyebrow && <div className="section-title mb-1">{eyebrow}</div>}
        <h1 className="h3 mb-1">{title}</h1>
        {subtitle && <p className="text-secondary mb-0">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
