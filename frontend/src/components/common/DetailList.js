/** Two-column label/value list used on review and detail pages. */
export default function DetailList({ items }) {
  return (
    <dl className="row mb-0 g-0">
      {items
        .filter((item) => !item.hidden)
        .map(({ label, value }) => (
          <div key={label} className="col-sm-6 mb-3 pe-sm-3">
            <dt className="small text-secondary fw-semibold mb-1">{label}</dt>
            <dd className="mb-0 text-break">{value || value === 0 ? value : <span className="text-secondary">—</span>}</dd>
          </div>
        ))}
    </dl>
  );
}
