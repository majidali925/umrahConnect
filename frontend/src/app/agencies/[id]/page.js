import { Suspense } from 'react';
import { LoadingState } from '@/components/common/States';
import JsonLd from '@/components/seo/JsonLd';
import { getPublicAgency } from '@/lib/publicData';
import { absoluteUrl, baseOpenGraph } from '@/lib/site';
import AgencyPage from './AgencyPage';

/** Loads the agency for the server render; null if missing, undefined if the API is unreachable. */
async function loadAgency(id) {
  try {
    return await getPublicAgency(id);
  } catch {
    return undefined;
  }
}

function describe(agency) {
  const place = [agency.city, agency.province].filter(Boolean).join(', ');
  return [
    `${agency.businessName} is a verified ${agency.vendorTypeLabel || 'Umrah vendor'}${place ? ` in ${place}` : ''}.`,
    agency.packageCount ? `${agency.packageCount} upcoming Umrah package${agency.packageCount > 1 ? 's' : ''}.` : null,
    agency.rating?.count
      ? `Rated ${agency.rating.average}/5 by ${agency.rating.count} traveller${agency.rating.count > 1 ? 's' : ''}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const agency = await loadAgency(id);
  if (agency === null) return { title: 'Agency not found', robots: { index: false } };
  if (!agency) return { title: 'Umrah agency' };

  const path = `/agencies/${id}`;
  const title = `${agency.businessName} — Umrah packages & reviews`;
  const description = describe(agency);
  const images = agency.headerImage ? [{ url: agency.headerImage.url }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, url: path, title, description, ...(images && { images }) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function structuredData(agency, id) {
  const url = absoluteUrl(`/agencies/${id}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: agency.businessName,
    description: agency.description || describe(agency),
    url,
    ...(agency.headerImage && { image: agency.headerImage.url }),
    ...(agency.city && {
      address: { '@type': 'PostalAddress', addressLocality: agency.city, addressRegion: agency.province, addressCountry: 'PK' },
    }),
    ...(agency.rating?.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: agency.rating.average,
        reviewCount: agency.rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

async function Agency({ params }) {
  const { id } = await params;
  const agency = await loadAgency(id);
  // Missing or unreachable: the client component shows the error state (with retry).
  return (
    <>
      {agency && <JsonLd data={structuredData(agency, id)} />}
      <AgencyPage initialAgency={agency || undefined} />
    </>
  );
}

export default function AgencyPublicPage({ params }) {
  return (
    <Suspense fallback={<LoadingState label="Loading agency…" />}>
      <Agency params={params} />
    </Suspense>
  );
}
