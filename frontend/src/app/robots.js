import { absoluteUrl } from '@/lib/site';

// /robots.txt. Signed-in areas send `X-Robots-Tag: noindex` instead (see next.config.mjs),
// so they're not blocked here: a blocked page can't show crawlers its noindex.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
