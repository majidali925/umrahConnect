import { Suspense } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/States';
import CityLinks from '@/features/packages/components/CityLinks';
import { browseQuery } from '@/features/packages/browseQuery';
import { browsePublicPackages } from '@/lib/publicData';
import PackageBrowser from './PackageBrowser';

/** Loads the requested page of results on the server, so the HTML already lists the packages. */
async function Listing({ searchParams }) {
  const params = await searchParams;
  const get = (key) => (typeof params[key] === 'string' ? params[key] : '');
  let initial;
  try {
    initial = await browsePublicPackages(browseQuery(get));
  } catch {
    // API unreachable: the browser loads the list itself (with retry).
  }
  return <PackageBrowser initial={initial} />;
}

export default function PackagesPage({ searchParams }) {
  return (
    <>
      <PageHeader
        eyebrow="Umrah packages"
        title="Umrah packages from Pakistan"
        subtitle="Upcoming Umrah packages from verified travel agencies. Compare prices and hotels, then request seats online — the agency confirms your booking directly."
      />

      <Suspense fallback={<LoadingState label="Loading packages…" />}>
        <Listing searchParams={searchParams} />
      </Suspense>

      <section className="mt-5 pt-4 border-top">
        <Suspense fallback={null}>
          <CityLinks heading={<h2 className="h5 mb-3">Umrah packages by departure city</h2>} />
        </Suspense>
        <p className="small text-secondary mt-4 mb-0" style={{ maxWidth: 760 }}>
          Every Umrah package on UmrahConnect is published by a travel agency our team has verified. Each listing shows
          the price per person in PKR, the Makkah and Madinah hotels with their walking distance from the Haram, room
          sharing and what is included, so you can compare Umrah packages side by side.{' '}
          <Link href="/#faq">Questions about booking?</Link>
        </p>
      </section>
    </>
  );
}
