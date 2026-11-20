// The admin panel must never be crawled.
export default function robots() {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
