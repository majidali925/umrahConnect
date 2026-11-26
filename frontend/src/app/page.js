import { Suspense } from 'react';
import Link from '@/components/common/IntentLink';
import { connection } from 'next/server';
import SiteHeader from '@/components/layouts/SiteHeader';
import SiteFooter from '@/components/layouts/SiteFooter';
import JsonLd from '@/components/seo/JsonLd';
import Icon from '@/components/common/Icon';
import SignedInRedirect from '@/components/layouts/SignedInRedirect';
import PackageCard from '@/features/packages/components/PackageCard';
import HeroSearch, { upcomingMonths } from '@/features/home/components/HeroSearch';
import HeroVisual from '@/features/home/components/HeroVisual';
import CompareBanner from '@/features/home/components/CompareBanner';
import MobileTabBar from '@/features/home/components/MobileTabBar';
import { browsePublicPackages, departureCityCounts } from '@/lib/publicData';
import { SITE_NAME, SITE_DESCRIPTION, absoluteUrl, cityPath } from '@/lib/site';
import { VERIFICATION_CATEGORY_LABELS } from '@/constants';
import styles from '@/features/home/home.module.scss';

export const metadata = { alternates: { canonical: '/' } };

// Shown on the page and given to search engines as an FAQPage, so the answers stay in sync.
const FAQS = [
  {
    q: 'How do I book an Umrah package on UmrahConnect?',
    a: 'Browse Umrah packages, open the one that suits you and request seats online. The travel agency that listed the package reviews your request and confirms your booking with you directly.',
  },
  {
    q: 'Are the Umrah agencies on UmrahConnect verified?',
    a: 'Yes. Every travel agency is reviewed by our verification team before it can publish Umrah packages — we check identity, business registration and licensing documents one by one.',
  },
  {
    q: 'What does an Umrah package cost?',
    a: 'Each agency sets its own price, shown per person in Pakistani rupees. Price depends mostly on the dates, the hotels and their distance from the Haram, and room sharing. You can filter packages by maximum price and sort them from lowest to highest.',
  },
  {
    q: 'Which cities do Umrah packages depart from?',
    a: 'Agencies list departures from cities across Pakistan. Pick a departure city on the packages page to see only the Umrah packages that leave from there.',
  },
  {
    q: 'What is included in an Umrah package?',
    a: 'Every package lists its Makkah and Madinah hotels with star rating and distance from the Haram, the number of nights in each city and what is included, so you can compare packages side by side before you request seats.',
  },
  {
    q: 'Is UmrahConnect a travel agency?',
    a: 'No. UmrahConnect is a marketplace: it lets you compare Umrah packages from many verified travel agencies in one place. Your booking is made with, and confirmed by, the agency you choose.',
  },
];

// Tells search engines who runs the site, how to search it and the answers to common questions.
const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/icon.svg'),
    description: SITE_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Pakistan' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/packages')}?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
];

const TRUST_POINTS = [
  { icon: 'checkCircle', label: 'Verified travel agencies only' },
  { icon: 'mosque', label: 'Hotel distance from the Haram in metres' },
  { icon: 'tag', label: 'Prices listed by the agency itself' },
];

const STEPS = [
  {
    title: 'Compare Umrah packages',
    text: 'See prices, travel dates, Makkah and Madinah hotels with their distance from the Haram, and what is included — side by side.',
    note: { icon: 'eye', text: 'Price per person shown upfront' },
  },
  {
    title: 'Request your seats online',
    text: 'Choose a package with the room sharing that suits you (quad, triple, double or single), create a free account and request seats.',
    note: { icon: 'lock', text: 'Your request goes straight to the agency', copper: true },
  },
  {
    title: 'Travel with a verified agency',
    text: 'The agency confirms your booking directly. Every agency is verified by our team before it can list a single package.',
    note: { icon: 'checkCircle', text: 'Identity, registration & licensing checked' },
  },
];

const VENDOR_POINTS = [
  'Open to registered Umrah travel agencies',
  'Five-step onboarding with secure document upload',
  'Clear verification status and feedback',
  'Manage seat requests from your dashboard',
];

const VETTING_STEPS = [
  { title: 'Register & verify', text: 'Create your agency account and confirm your email.' },
  { title: 'Complete onboarding', text: 'Business details, contacts, address and documents.' },
  { title: 'Verification review', text: 'Our team reviews each document individually.' },
  { title: 'Get approved & publish', text: 'Publish your Umrah packages and respond to seat requests.' },
];

/** Package totals per departure city, or null when the API can't be reached. */
async function loadCityCounts() {
  try {
    return await departureCityCounts();
  } catch {
    return null;
  }
}

/** The hero's search form with live cities and package count (rendered per request). */
async function LiveHeroSearch() {
  await connection();
  const counts = await loadCityCounts();
  const cities = (counts?.cities ?? []).map((c) => c.city).sort((a, b) => a.localeCompare(b));
  return <HeroSearch cities={cities} months={upcomingMonths()} total={counts?.total} />;
}

/** Trust points, with the live number of upcoming departures once known. */
function TrustStrip({ total }) {
  return (
    <div className={styles.trustStrip}>
      {TRUST_POINTS.map((p) => (
        <span key={p.label} className={styles.trustItem}>
          <Icon name={p.icon} size={16} /> {p.label}
        </span>
      ))}
      {total > 0 && (
        <span className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden="true" />
          {total} upcoming departure{total === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}

async function LiveTrustStrip() {
  await connection();
  const counts = await loadCityCounts();
  return <TrustStrip total={counts?.total} />;
}

/** Chips linking to each departure city's package page, busiest first. */
async function CityChips() {
  await connection();
  const counts = await loadCityCounts();
  if (!counts?.cities.length) return null;

  return (
    <section className={styles.cities} aria-labelledby="cities-heading">
      <h2 id="cities-heading" className={styles.citiesHeading}>
        <Icon name="pin" size={18} className="d-none d-md-inline" />
        <span className="d-none d-md-inline">Explore by departure city:</span>
        <span className={`${styles.eyebrow} d-md-none mb-0`}>Find by city</span>
        <span className={`${styles.cityCount} d-md-none`}>
          {counts.cities.length} cit{counts.cities.length === 1 ? 'y' : 'ies'}
        </span>
      </h2>
      <ul className={styles.chips}>
        <li>
          <Link href="/packages" className={`${styles.chip} ${styles.chipActive}`}>
            All Pakistan <span className={styles.chipCount}>{counts.total}</span>
          </Link>
        </li>
        {counts.cities.map(({ city, count }) => (
          <li key={city}>
            <Link href={cityPath(city)} className={styles.chip} title={`Umrah packages from ${city}`}>
              {city} <span className={styles.chipCount}>{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The next few departures, server-rendered so the home page links straight to live packages. */
async function UpcomingPackages() {
  // Per request (the list itself is cached), so a build without the API never freezes an empty section.
  await connection();
  let packages = [];
  let total = 0;
  try {
    const result = await browsePublicPackages({ sort: 'departure', limit: 6 });
    packages = result.data;
    total = result.meta?.total ?? packages.length;
  } catch {
    return null;
  }
  if (!packages.length) return null;

  return (
    <section id="packages" className={styles.section}>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-4">
        <div>
          <p className={styles.eyebrow}>Upcoming departures</p>
          <h2 className={styles.h2}>Verified Umrah packages</h2>
        </div>
        <Link href="/packages" className={styles.viewAll}>
          View all {total} package{total === 1 ? '' : 's'} <Icon name="arrowRight" size={16} />
        </Link>
      </div>
      <div className="row g-3 g-lg-4">
        {packages.map((pkg) => (
          <div key={pkg._id} className="col-md-6 col-lg-4">
            <PackageCard pkg={pkg} titleAs="h3" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className={`d-flex flex-column min-vh-100 ${styles.page}`}>
      <JsonLd data={STRUCTURED_DATA} />
      <SignedInRedirect />
      <SiteHeader />

      <main className="container">
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.heroPill}>
              <Icon name="shield" size={14} /> Pakistan’s verified Umrah marketplace
            </p>
            <h1 className={styles.title}>
              Compare <span className={styles.highlight}>Umrah packages</span> from verified agencies.
            </h1>
            <p className={styles.lead}>
              Transparent hotel distances from the Haram, verified travel agencies and seat requests online — across
              Pakistan.
            </p>
          </div>
          <div className={styles.heroVisual}>
            <HeroVisual />
          </div>
          {/* Under the text on large screens, under the picture on phones. */}
          <div className={styles.heroSearch}>
            <Suspense fallback={<HeroSearch />}>
              <LiveHeroSearch />
            </Suspense>
          </div>
        </section>

        <div className="d-none d-md-block">
          <Suspense fallback={<TrustStrip />}>
            <LiveTrustStrip />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <CityChips />
        </Suspense>

        <Suspense fallback={null}>
          <UpcomingPackages />
        </Suspense>

        <CompareBanner />
      </main>

      {/* How it works */}
      <section id="how-it-works" className={styles.band}>
        <div className="container">
          <div className="text-center mb-4 mb-md-5">
            <p className={styles.eyebrowMuted}>Simple & honest</p>
            <h2 className={styles.h2}>Book your Umrah with complete peace of mind</h2>
            <p className={`${styles.sub} mx-auto`}>
              Every travel agency is reviewed by our verification team — identity, business registration and licensing —
              before it appears on UmrahConnect.
            </p>
          </div>
          <div className="row g-3 g-lg-4">
            {STEPS.map((step, i) => (
              <div className="col-md-4" key={step.title}>
                <div className={styles.step}>
                  <div className={`${styles.stepNumber} ${styles[`stepNumber${i + 1}`]}`}>{i + 1}</div>
                  <div className="min-w-0">
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepText}>{step.text}</p>
                    <p className={`${styles.stepNote} ${step.note.copper ? styles.stepNoteCopper : ''}`}>
                      <Icon name={step.note.icon} size={14} /> {step.note.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For agencies */}
      <section id="for-agencies" className="container">
        <div className={styles.agencyCard}>
          <div className={styles.agencyPitch}>
            <p className={styles.eyebrow}>For Umrah travel agencies</p>
            <h2 className={styles.h2}>Reach pilgrims across Pakistan</h2>
            <p className={styles.agencyText}>
              List your Umrah travel agency on UmrahConnect. Once our team verifies your application, you can publish Umrah
              packages and receive seat requests from pilgrims online.
            </p>
            <ul className={styles.agencyPoints}>
              {VENDOR_POINTS.map((point) => (
                <li key={point}>
                  <Icon name="checks" size={16} /> {point}
                </li>
              ))}
            </ul>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/register/vendor" className={`btn ${styles.agencyBtn}`}>
                Register your agency <Icon name="arrowRight" size={16} />
              </Link>
              <Link href="/login" className={`btn ${styles.ghostBtn}`}>
                Agency sign in
              </Link>
            </div>
          </div>

          <div id="verification" className={styles.vetting}>
            <h3 className={styles.vettingTitle}>Simple 4-step agency verification</h3>
            <ol className={styles.vettingSteps}>
              {VETTING_STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={styles.section}>
        <div className="container">
          <div className="text-center mb-4">
            <p className={styles.eyebrow}>Frequently asked questions</p>
            <h2 className={styles.h2}>Everything you need to know about Umrah bookings</h2>
          </div>
          <div className={styles.faqList}>
            {FAQS.map(({ q, a }, i) => (
              <details key={q} className={styles.faq} open={i === 0}>
                <summary>
                  <h3 className={styles.faqQ}>{q}</h3>
                  <Icon name="chevronDown" size={18} className={styles.faqChevron} />
                </summary>
                <p className={styles.faqA}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Verification promise */}
      <div className="container mb-5">
        <div className={styles.promise}>
          <span className={styles.promiseIcon}>
            <Icon name="shield" size={22} />
          </span>
          <div className="flex-grow-1 min-w-0">
            <strong className="d-block">Every agency verified before it can list</strong>
            <span className="small text-secondary">
              Our team checks each agency’s documents one by one before any package goes live.
            </span>
          </div>
          <ul className={styles.promiseTags}>
            {Object.values(VERIFICATION_CATEGORY_LABELS).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </div>

      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
