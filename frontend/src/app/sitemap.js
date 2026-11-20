import { connection } from 'next/server';
import { listPublicPackages } from '@/lib/publicData';
import { absoluteUrl } from '@/lib/site';

// /sitemap.xml: the public pages plus every listed package.
export default async function sitemap() {
  // Built per request (the package list itself is cached for hours), so a build
  // without the API reachable never freezes an empty sitemap.
  await connection();

  const pages = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/packages'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/register/vendor'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/register'), changeFrequency: 'monthly', priority: 0.3 },
  ];

  let packages = [];
  try {
    packages = await listPublicPackages();
  } catch {
    // API unavailable: still serve the static pages.
  }

  return [
    ...pages,
    ...packages.map((p) => ({
      url: absoluteUrl(`/packages/${p._id}`),
      lastModified: p.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    })),
  ];
}
