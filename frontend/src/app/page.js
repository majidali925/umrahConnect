import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import SiteHeader from '@/components/layouts/SiteHeader';
import SiteFooter from '@/components/layouts/SiteFooter';
import JsonLd from '@/components/seo/JsonLd';
import SignedInRedirect from '@/components/layouts/SignedInRedirect';
import PackageCard from '@/features/packages/components/PackageCard';
import CityLinks from '@/features/packages/components/CityLinks';
import { browsePublicPackages } from '@/lib/publicData';
import { SITE_NAME, SITE_DESCRIPTION, absoluteUrl } from '@/lib/site';
import styles from './page.module.scss';

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

const STEPS = [
  { title: 'Compare Umrah packages', text: 'See prices, travel dates, hotels and their distance from the Haram, and what is included — side by side.' },
  { title: 'Request your seats', text: 'Create a free account and request seats online on the package you choose.' },
  { title: 'Travel with a verified agency', text: 'The agency confirms your booking directly. Every agency is verified by our team before it can list packages.' },
];

const VENDOR_POINTS = [
  'Open to registered Umrah travel agencies across Pakistan',
  'Simple five-step onboarding with secure document upload',
  'Transparent verification status and clear feedback from our team',
];

/** The next few departures, server-rendered so the home page links straight to live packages. */
async function UpcomingPackages() {
  // Per request (the list itself is cached), so a build without the API never freezes an empty section.
  await connection();
  let packages = [];
  try {
    ({ data: packages } = await browsePublicPackages({ sort: 'departure', limit: 6 }));
  } catch {
    return null;
  }
  if (!packages.length) return null;

  return (
    <section id="packages" className="py-5 my-lg-4">
      <div className="container">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
          <div>
            <div className="section-title mb-2">Upcoming departures</div>
            <h2 className="h1 mb-0">Latest Umrah packages</h2>
          </div>
          <Link href="/packages" className="btn btn-outline-primary">
            View all Umrah packages →
          </Link>
        </div>
        <div className="row g-4">
          {packages.map((pkg) => (
            <div key={pkg._id} className="col-md-6 col-lg-4">
              <PackageCard pkg={pkg} titleAs="h3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <JsonLd data={STRUCTURED_DATA} />
      <SignedInRedirect />
      <SiteHeader />

      <main>
        <section className={styles.hero}>
          <div className="container position-relative">
            <div className="row align-items-center g-4 g-lg-5">
              <div className="col-lg-7">
                <p className={styles.eyebrow}>Pakistan’s verified Umrah marketplace</p>
                <h1 className={styles.title}>
                  Compare <span className={styles.highlight}>Umrah packages</span> from verified Umrah agencies
                </h1>
                <p className={styles.lead}>
                  Find the right Umrah package from travel agencies across Pakistan. Compare prices, hotels near the Haram
                  in Makkah and Madinah and what is included — then request seats online.
                </p>
                <div className="d-flex flex-wrap gap-3">
                  <Link href="/packages" className="btn btn-gold btn-lg">
                    Umrah packages
                  </Link>
                  <Link href="/register" className="btn btn-outline-light btn-lg">
                    Create a free account
                  </Link>
                </div>
              </div>
              <div className="col-lg-5">
                <div className={styles.card}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-bold">Every agency is verified</span>
                    <span className="badge rounded-pill badge-soft badge-soft-success">Verified</span>
                  </div>
                  {['Identity verification', 'Business registration', 'Licensing & authorization'].map((label) => (
                    <div key={label} className={styles.checkRow}>
                      <span className={styles.check} aria-hidden="true">
                        ✓
                      </span>
                      {label}
                    </div>
                  ))}
                  <p className="small text-secondary mt-3 mb-0">
                    Every Umrah package names the verified agency behind it, so you always know who you are booking with.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <UpcomingPackages />
        </Suspense>

        <Suspense fallback={null}>
          <CityLinks
            heading={
              <>
                <div className="section-title mb-2">Find by city</div>
                <h2 className="h1 mb-4">Umrah packages by departure city</h2>
              </>
            }
            wrap={(content) => (
              <section className="py-5 bg-surface border-top border-bottom">
                <div className="container">{content}</div>
              </section>
            )}
          />
        </Suspense>

        <section id="how-it-works" className="py-5 my-lg-4">
          <div className="container">
            <div className="text-center mb-5">
              <div className="section-title mb-2">How it works</div>
              <h2 className="h1">Book your Umrah with confidence</h2>
            </div>
            <div className="row g-4">
              {STEPS.map((step, i) => (
                <div className="col-md-4" key={step.title}>
                  <div className={styles.step}>
                    <div className={styles.stepNumber}>{i + 1}</div>
                    <h3 className="h5">{step.title}</h3>
                    <p className="text-secondary mb-0">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="for-agencies" className="py-5 bg-surface border-top border-bottom">
          <div className="container">
            <div className="row align-items-center g-4 g-lg-5">
              <div className="col-lg-6">
                <div className="section-title mb-2">For Umrah agencies</div>
                <h2 className="h1 mb-3">Reach pilgrims across Pakistan</h2>
                <p className="text-secondary mb-4">
                  List your Umrah travel agency on UmrahConnect. Once our team verifies your application, you can publish
                  Umrah packages and receive seat requests from pilgrims online.
                </p>
                <ul className="list-unstyled mb-4">
                  {VENDOR_POINTS.map((point) => (
                    <li key={point} className="d-flex gap-2 mb-2">
                      <span className="text-gold fw-bold">◆</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register/vendor" className="btn btn-primary btn-lg">
                  Register your agency
                </Link>
              </div>
              <div className="col-lg-6">
                <ol className={styles.timeline}>
                  <li>
                    <strong>Register & verify</strong>
                    <span>Create your agency account and confirm your email.</span>
                  </li>
                  <li>
                    <strong>Complete onboarding</strong>
                    <span>Business details, contacts, address and documents.</span>
                  </li>
                  <li>
                    <strong>Verification review</strong>
                    <span>Our team reviews each document individually.</span>
                  </li>
                  <li>
                    <strong>Get approved</strong>
                    <span>Publish your Umrah packages and respond to seat requests.</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="py-5 my-lg-4">
          <div className="container">
            <div className="text-center mb-5">
              <div className="section-title mb-2">FAQ</div>
              <h2 className="h1">Umrah packages: common questions</h2>
            </div>
            <div className="row g-4">
              {FAQS.map(({ q, a }) => (
                <div className="col-md-6" key={q}>
                  <h3 className="h5">{q}</h3>
                  <p className="text-secondary mb-0">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
