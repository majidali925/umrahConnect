import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
import { LoadingState, ErrorState } from '@/components/common/States';
import JsonLd from '@/components/seo/JsonLd';
import PackageCard from '@/features/packages/components/PackageCard';
import CompareTray from '@/features/packages/components/CompareTray';
import CityLinks from '@/features/packages/components/CityLinks';
import { browsePublicPackages, listDepartureCities } from '@/lib/publicData';
import { absoluteUrl, baseOpenGraph, citySlug, cityPath } from '@/lib/site';
import { formatCurrency } from '@/utils/format';

// Landing pages for searches like "Umrah packages from Lahore": one per departure city
// that currently has listed packages.

const LIMIT = 24;

/** The city's packages; null if no listed package departs from it, undefined if the API is unreachable. */
async function loadCity(slug) {
  try {
    const city = (await listDepartureCities()).find((c) => citySlug(c) === slug);
    if (!city) return null;
    const [listing, cheapest] = await Promise.all([
      browsePublicPackages({ departureCity: city, sort: 'departure', limit: LIMIT }),
      browsePublicPackages({ departureCity: city, sort: 'price_asc', limit: 1 }),
    ]);
    if (!listing.data.length) return null;
    return {
      city,
      packages: listing.data,
      total: listing.meta?.total ?? listing.data.length,
      fromPrice: cheapest.data[0]?.pricePerPerson,
    };
  } catch {
    return undefined;
  }
}

const browseHref = (city) => `/packages?departureCity=${encodeURIComponent(city)}`;

function summary({ city, total, fromPrice }) {
  const count = `${total} upcoming Umrah package${total === 1 ? '' : 's'}`;
  const price = fromPrice ? `, from ${formatCurrency(fromPrice)} per person` : '';
  return `${count} departing from ${city}${price}, offered by verified travel agencies.`;
}

export async function generateMetadata({ params }) {
  const { city: slug } = await params;
  const result = await loadCity(slug);
  if (result === null) return { title: 'Page not found', robots: { index: false } };
  if (!result) return { title: 'Umrah packages' };

  const { city } = result;
  const path = cityPath(city);
  const title = `Umrah packages from ${city}`;
  const description = `${summary(result)} Compare prices, hotels near the Haram in Makkah and Madinah and what is included, then request seats online.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, url: path, title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function structuredData({ city, packages }) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Umrah packages', item: absoluteUrl('/packages') },
        { '@type': 'ListItem', position: 3, name: `From ${city}`, item: absoluteUrl(cityPath(city)) },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Umrah packages from ${city}`,
      itemListElement: packages.map((pkg, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: pkg.title,
        url: absoluteUrl(`/packages/${pkg._id}`),
      })),
    },
  ];
}

async function CityPackages({ params }) {
  const { city: slug } = await params;
  const result = await loadCity(slug);
  if (result === null) notFound();
  if (!result) {
    return (
      <>
        <ErrorState title="Packages unavailable" message="We couldn’t load packages right now. Please try again shortly." />
        <div className="text-center">
          <Link href="/packages">Browse all Umrah packages</Link>
        </div>
      </>
    );
  }

  const { city, packages, total } = result;
  return (
    <>
      <JsonLd data={structuredData(result)} />
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link href="/">Home</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/packages">Umrah packages</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {city}
          </li>
        </ol>
      </nav>

      <PageHeader
        eyebrow="Umrah packages"
        title={`Umrah packages from ${city}`}
        subtitle={summary(result)}
        actions={
          <Link href={browseHref(city)} className="btn btn-outline-primary">
            Filter &amp; sort
          </Link>
        }
      />

      <div className="row g-4 mb-4">
        {packages.map((pkg) => (
          <div key={pkg._id} className="col-md-6 col-lg-4">
            <PackageCard pkg={pkg} />
          </div>
        ))}
      </div>
      {total > packages.length && (
        <div className="text-center mb-4">
          <Link href={browseHref(city)} className="btn btn-primary">
            See all {total} packages from {city}
          </Link>
        </div>
      )}

      <section className="mt-5 pt-4 border-top">
        <h2 className="h5 mb-3">Booking Umrah from {city}</h2>
        <p className="text-secondary" style={{ maxWidth: 760 }}>
          Umrah packages from {city} on UmrahConnect are listed by travel agencies our team has verified — identity,
          business registration and licensing. Each package shows its travel dates, the Makkah and Madinah hotels with
          their distance from the Haram, room sharing, what is included and the price per person. Pick a package and
          request seats online; the agency then confirms your booking with you directly.
        </p>
        <Suspense fallback={null}>
          <CityLinks exclude={city} heading={<h2 className="h5 mt-4 mb-3">Umrah packages from other cities</h2>} />
        </Suspense>
      </section>
      <CompareTray />
    </>
  );
}

export default function CityPackagesPage({ params }) {
  return (
    <Suspense fallback={<LoadingState label="Loading packages…" />}>
      <CityPackages params={params} />
    </Suspense>
  );
}
