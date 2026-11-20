import Link from 'next/link';
import SiteHeader from '@/components/layouts/SiteHeader';
import SiteFooter from '@/components/layouts/SiteFooter';
import JsonLd from '@/components/seo/JsonLd';
import { SITE_NAME, SITE_DESCRIPTION, absoluteUrl } from '@/lib/site';
import styles from './page.module.scss';

export const metadata = { alternates: { canonical: '/' } };

// Tells search engines who runs the site and how to search it (sitelinks search box).
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
];

const STEPS = [
  { title: 'Create your account', text: 'Sign up with your email and Pakistani mobile number and verify it with a one-time code.' },
  { title: 'Explore verified vendors', text: 'Every agency and operator is reviewed before they can publish Umrah packages.' },
  { title: 'Travel with confidence', text: 'See exactly what has been verified — identity, business registration and licensing.' },
];

const VENDOR_POINTS = [
  'Registered travel agencies and independent Umrah operators welcome',
  'Simple five-step onboarding with secure document upload',
  'Transparent verification status and clear feedback from our team',
];

export default function HomePage() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <JsonLd data={STRUCTURED_DATA} />
      <SiteHeader />

      <section className={styles.hero}>
        <div className="container position-relative">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-7">
              <p className={styles.eyebrow}>Pakistan’s verified Umrah marketplace</p>
              <h1 className={styles.title}>
                Find a <span className={styles.highlight}>trusted</span> partner for your Umrah journey
              </h1>
              <p className={styles.lead}>
                UmrahConnect brings pilgrims together with travel agencies and Umrah operators that have been
                reviewed by our verification team.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link href="/packages" className="btn btn-gold btn-lg">
                  Browse packages
                </Link>
                <Link href="/register" className="btn btn-outline-light btn-lg">
                  Create a free account
                </Link>
                <Link href="/register/vendor" className="btn btn-outline-light btn-lg">
                  List your agency
                </Link>
              </div>
            </div>
            <div className="col-lg-5">
              <div className={styles.card}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="fw-bold">Verification at a glance</span>
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
                  Licensed agencies and independent operators are always labelled clearly — never mixed up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-5 my-lg-4">
        <div className="container">
          <div className="text-center mb-5">
            <div className="section-title mb-2">How it works</div>
            <h2 className="h1">Built on trust, from the first step</h2>
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
              <div className="section-title mb-2">For agencies & operators</div>
              <h2 className="h1 mb-3">Reach pilgrims across Pakistan</h2>
              <p className="text-secondary mb-4">
                Join UmrahConnect as a registered travel agency or an independent Umrah operator. Once our team
                verifies your application, you’ll be ready to publish packages as new features launch.
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
                Start vendor registration
              </Link>
            </div>
            <div className="col-lg-6">
              <ol className={styles.timeline}>
                <li>
                  <strong>Register & verify</strong>
                  <span>Create your vendor account and confirm your email.</span>
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
                  <span>Approved vendors unlock publishing features.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
