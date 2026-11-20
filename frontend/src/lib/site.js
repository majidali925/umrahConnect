// Public facts about the site used for SEO: canonical URLs, sitemap, share previews.

/** The public origin, e.g. https://umrahconnect.pk. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080').replace(/\/+$/, '');

export const SITE_NAME = 'UmrahConnect';

export const SITE_DESCRIPTION =
  'Compare Umrah packages from verified travel agencies across Pakistan. See prices, hotel distance from the Haram and what is included, then request seats online.';

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Open Graph fields shared by every page; a page's own `openGraph` replaces the parent's, so pages spread this in. */
export const baseOpenGraph = {
  siteName: SITE_NAME,
  locale: 'en_PK',
  type: 'website',
};
