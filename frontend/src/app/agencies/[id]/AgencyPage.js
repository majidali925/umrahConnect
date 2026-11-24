'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardBody, Row, Col } from 'reactstrap';
import CloudImage from '@/components/common/CloudImage';
import Pagination from '@/components/common/Pagination';
import { StarRating } from '@/components/common/StarRating';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import PackageCard from '@/features/packages/components/PackageCard';
import CompareTray from '@/features/packages/components/CompareTray';
import { packageService, vendorService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, initials } from '@/utils/format';
import styles from './AgencyPage.module.scss';

const PACKAGES_PER_PAGE = 6;
const REVIEWS_PER_PAGE = 5;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Turns a pager click into a scroll back to the top of its section. */
function usePagedSection() {
  const ref = useRef(null);
  const [page, setPage] = useState(1);
  const changePage = (p) => {
    setPage(p);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return { ref, page, changePage };
}

function Hero({ agency }) {
  const { rating } = agency;
  const place = [agency.city, agency.province].filter(Boolean).join(', ');
  return (
    <header className={`${styles.hero} ${agency.headerImage ? '' : styles.heroEmpty}`}>
      {agency.headerImage && (
        <CloudImage
          src={agency.headerImage.url}
          alt={`${agency.businessName} header photo`}
          fill
          preload
          sizes="(min-width: 1400px) 1296px, 100vw"
          className={styles.heroImg}
        />
      )}
      <div className={styles.heroContent}>
        <div className={styles.avatar} aria-hidden="true">
          {initials(agency.businessName)}
        </div>
        <div className="min-w-0">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
            <h1 className={`${styles.heroTitle} mb-0`}>{agency.businessName}</h1>
            <span className={styles.verified}>✓ Verified</span>
          </div>
          <div className={styles.heroMeta}>
            {place && <span>{place}</span>}
            {rating.count > 0 ? (
              <a href="#reviews" className={styles.heroRating}>
                <StarRating value={rating.average} size="sm" />
                <strong>{rating.average.toFixed(1)}</strong>
                <span>({plural(rating.count, 'review')})</span>
              </a>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Stats({ agency }) {
  const items = [
    {
      label: 'Traveller rating',
      value: agency.rating.count ? `${agency.rating.average.toFixed(1)} / 5` : '—',
      href: '#reviews',
    },
    { label: 'Upcoming packages', value: agency.packageCount, href: '#packages' },
    { label: 'Experience', value: agency.experience !== undefined && agency.experience !== null ? plural(agency.experience, 'year') : '—' },
    { label: 'Verified since', value: formatDate(agency.verifiedSince) || '—' },
  ];
  return (
    <div className={styles.stats}>
      {items.map((item) => {
        const body = (
          <>
            <div className={styles.statValue}>{item.value}</div>
            <div className={styles.statLabel}>{item.label}</div>
          </>
        );
        return item.href ? (
          <a key={item.label} href={item.href} className={styles.stat}>
            {body}
          </a>
        ) : (
          <div key={item.label} className={styles.stat}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

function Packages({ agency }) {
  const { ref, page, changePage } = usePagedSection();
  const { data, meta, loading, error, reload } = useFetch(
    () => packageService.browse({ agencyId: agency._id, page, limit: PACKAGES_PER_PAGE }),
    [agency._id, page],
  );

  return (
    <section id="packages" ref={ref} className={styles.section}>
      <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-3">
        <h2 className="h4 mb-0">Upcoming packages</h2>
        {meta?.total > 0 && <span className="text-secondary small">{plural(meta.total, 'package')}</span>}
      </div>
      {loading && !data ? (
        <LoadingState label="Loading packages…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title="No upcoming packages right now"
            message={`${agency.businessName} has no packages open for booking at the moment. Check back soon.`}
            action={
              <Link href="/packages" className="btn btn-outline-primary mt-2">
                Browse all packages
              </Link>
            }
          />
        </Card>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <Row className="g-4 mb-4">
            {data.map((pkg) => (
              <Col key={pkg._id} md={6} xl={4}>
                <PackageCard pkg={pkg} showAgency={false} />
              </Col>
            ))}
          </Row>
          <Pagination meta={meta} onChange={changePage} />
        </div>
      )}
    </section>
  );
}

function RatingSummary({ rating }) {
  return (
    <Card className={styles.summary}>
      <CardBody className="p-4">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className={styles.bigScore}>{rating.average.toFixed(1)}</div>
          <div>
            <StarRating value={rating.average} size="lg" />
            <div className="small text-secondary mt-1">Based on {plural(rating.count, 'review')}</div>
          </div>
        </div>
        <ul className="list-unstyled mb-0">
          {[5, 4, 3, 2, 1].map((stars) => {
            const n = rating.distribution[stars] || 0;
            const pct = rating.count ? Math.round((n / rating.count) * 100) : 0;
            return (
              <li key={stars} className={styles.barRow}>
                <span className="text-nowrap">{stars} ★</span>
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="text-secondary text-end">
                  {n}
                  <span className="visually-hidden"> {plural(n, 'review')} with {stars} stars</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function ReviewItem({ review }) {
  return (
    <article className={styles.review}>
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <div className={styles.reviewAvatar} aria-hidden="true">
            {initials(review.reviewerName)}
          </div>
          <div className="min-w-0">
            <div className="fw-semibold">{review.reviewerName}</div>
            <div className="small text-success">✓ Verified traveller</div>
          </div>
        </div>
        <time className="small text-secondary text-nowrap" dateTime={review.createdAt}>
          {formatDate(review.createdAt)}
        </time>
      </div>
      <div className="mt-2">
        <StarRating value={review.rating} size="sm" />
      </div>
      {review.comment && (
        <p className="mb-0 mt-2 text-break" style={{ whiteSpace: 'pre-line' }}>
          {review.comment}
        </p>
      )}
      {review.packageTitle && <div className="small text-secondary mt-2">Travelled on: {review.packageTitle}</div>}
    </article>
  );
}

function Reviews({ agency }) {
  const { ref, page, changePage } = usePagedSection();
  const { data, meta, loading, error, reload } = useFetch(
    () => vendorService.reviews(agency._id, { page, limit: REVIEWS_PER_PAGE }),
    [agency._id, page],
  );
  const { rating } = agency;

  return (
    <section id="reviews" ref={ref} className={styles.section}>
      <h2 className="h4 mb-1">Customer ratings & reviews</h2>
      <p className="text-secondary small mb-3">
        Only travellers who completed a trip booked through UmrahConnect can review an agency.
      </p>
      {rating.count === 0 ? (
        <Card>
          <EmptyState
            title="No reviews yet"
            message={`Reviews appear here once travellers complete a trip with ${agency.businessName}.`}
          />
        </Card>
      ) : (
        <Row className="g-4">
          <Col lg={4}>
            <RatingSummary rating={rating} />
          </Col>
          <Col lg={8}>
            {loading && !data ? (
              <LoadingState label="Loading reviews…" />
            ) : error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : (
              <div style={{ opacity: loading ? 0.6 : 1 }}>
                <Card className="mb-3">
                  <CardBody className="p-0">
                    {data.map((review) => (
                      <ReviewItem key={review._id} review={review} />
                    ))}
                  </CardBody>
                </Card>
                <Pagination meta={meta} onChange={changePage} />
              </div>
            )}
          </Col>
        </Row>
      )}
    </section>
  );
}

/**
 * Public agency page: header photo, packages and customer reviews. The server renders it
 * with the profile already loaded (for search engines and link previews); it then refreshes
 * in the browser.
 */
export default function AgencyPage({ initialAgency }) {
  const { id } = useParams();
  const { data: agency, loading, error, reload } = useFetch(() => vendorService.get(id), [id], { initialData: initialAgency });

  if (loading && !agency) return <LoadingState label="Loading agency…" />;
  if (error && !agency) {
    return (
      <>
        <ErrorState title="Agency unavailable" message={error} onRetry={reload} />
        <div className="text-center">
          <Link href="/packages">← Browse all packages</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/packages" className="small d-inline-block mb-3">
        ← All packages
      </Link>
      <Hero agency={agency} />
      <Stats agency={agency} />

      {agency.description && (
        <section className={styles.section}>
          <Card>
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-2">About {agency.businessName}</h2>
              <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                {agency.description}
              </p>
            </CardBody>
          </Card>
        </section>
      )}

      <Packages agency={agency} />
      <Reviews agency={agency} />
      <CompareTray />
    </>
  );
}
