export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('en-PK', {
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

/** Whole Pakistani rupees, e.g. "PKR 2,500". */
export function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return `PKR ${Number(value).toLocaleString('en-PK')}`;
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
