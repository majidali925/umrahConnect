/** Only allow same-origin relative redirects (prevents open redirects via ?next=). */
export function safeNextPath(next) {
  // Must be a path on this site: reject "//host" and "/\host", which browsers treat as another origin.
  if (typeof next !== 'string' || !/^\/(?![/\\])/.test(next) || next.startsWith('/login')) return null;
  return next;
}
