import { Suspense } from 'react';
import { LoadingState } from '@/components/common/States';
import JsonLd from '@/components/seo/JsonLd';
import { getPublicPackage } from '@/lib/publicData';
import { absoluteUrl, baseOpenGraph } from '@/lib/site';
import { ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDate, formatDistance } from '@/utils/format';
import PackageDetail from './PackageDetail';

/** Loads the package for the server render; null if missing, undefined if the API is unreachable. */
async function loadPackage(id) {
  try {
    return await getPublicPackage(id);
  } catch {
    return undefined;
  }
}

function describe(pkg) {
  const agency = pkg.agency?.businessName;
  return [
    `${pkg.durationDays}-day Umrah from ${pkg.departureCity}, departing ${formatDate(pkg.departureDate)}.`,
    `${pkg.makkahHotel.name} (${formatDistance(pkg.makkahHotel.distanceMeters)} from the Haram) and ${pkg.madinahHotel.name}.`,
    `${formatCurrency(pkg.pricePerPerson)} per person, ${ROOM_TYPE_LABELS[pkg.roomType]?.toLowerCase() || 'shared room'}.`,
    agency && `By verified vendor ${agency}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const pkg = await loadPackage(id);
  if (pkg === null) return { title: 'Package not found', robots: { index: false } };
  if (!pkg) return { title: 'Umrah package' };

  const path = `/packages/${id}`;
  const title = pkg.agency ? `${pkg.title} by ${pkg.agency.businessName}` : pkg.title;
  const description = describe(pkg);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, url: path, title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function structuredData(pkg, id) {
  const url = absoluteUrl(`/packages/${id}`);
  const seller = pkg.agency && { '@type': 'Organization', name: pkg.agency.businessName };
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: pkg.title,
      description: pkg.description || describe(pkg),
      url,
      category: 'Umrah package',
      ...(seller && { brand: { '@type': 'Brand', name: pkg.agency.businessName } }),
      offers: {
        '@type': 'Offer',
        url,
        price: pkg.pricePerPerson,
        priceCurrency: 'PKR',
        availability: pkg.availableSeats > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        validThrough: pkg.departureDate,
        ...(seller && { seller }),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Umrah packages', item: absoluteUrl('/packages') },
        { '@type': 'ListItem', position: 3, name: pkg.title, item: url },
      ],
    },
  ];
}

async function Detail({ params }) {
  const { id } = await params;
  const pkg = await loadPackage(id);
  // Missing or unreachable: the client component shows the error state (with retry).
  return (
    <>
      {pkg && <JsonLd data={structuredData(pkg, id)} />}
      <PackageDetail initialPackage={pkg || undefined} />
    </>
  );
}

export default function PackageDetailPage({ params }) {
  return (
    <Suspense fallback={<LoadingState label="Loading package…" />}>
      <Detail params={params} />
    </Suspense>
  );
}
