export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  // A fixed zone keeps server-rendered and browser-rendered dates identical.
  return date.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Displays +923001234567 as 0300 1234567. */
export function formatPhone(phone) {
  if (!phone) return '—';
  const match = String(phone).match(/^\+92(3\d{2})(\d{7})$/);
  if (match) return `0${match[1]} ${match[2]}`;
  return String(phone).replace(/^\+92/, '0');
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const pkr = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });

/** Formats whole rupees, e.g. 350000 → "Rs 350,000". */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  return pkr.format(value);
}

/** "12 Dec 2026 → 26 Dec 2026" */
export const formatDateRange = (from, to) => `${formatDate(from)} → ${formatDate(to)}`;

/** Value for an <input type="date"> from an ISO date (packages store dates as UTC midnight). */
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

/** Tomorrow as YYYY-MM-DD in the user's local time: the earliest allowed departure date. */
export function tomorrowInput() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const formatDistance = (metres) =>
  metres === null || metres === undefined ? '—' : metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`;
