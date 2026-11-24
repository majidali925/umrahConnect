import Link from 'next/link';
import { connection } from 'next/server';
import { listDepartureCities } from '@/lib/publicData';
import { cityPath } from '@/lib/site';

/**
 * Links to each departure city's Umrah package page: internal links that help search
 * engines find the city pages. Render inside <Suspense>. Renders nothing when there are
 * no cities or the API can't be reached — including the optional `heading`, and whatever
 * `wrap(content)` puts around it (e.g. a page section).
 */
export default async function CityLinks({ exclude, heading, wrap = (content) => content }) {
  // Per request (the city list itself is cached), so a build without the API never freezes an empty list.
  await connection();
  let cities = [];
  try {
    cities = await listDepartureCities();
  } catch {
    return null;
  }
  const shown = cities.filter((c) => c !== exclude);
  if (!shown.length) return null;

  return wrap(
    <>
      {heading}
      <ul className="list-unstyled d-flex flex-wrap gap-2 mb-0">
        {shown.map((city) => (
          <li key={city}>
            <Link href={cityPath(city)} className="btn btn-sm btn-light border">
              Umrah packages from {city}
            </Link>
          </li>
        ))}
      </ul>
    </>,
  );
}
