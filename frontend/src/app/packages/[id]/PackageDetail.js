'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardBody, Row, Col } from 'reactstrap';
import DetailList from '@/components/common/DetailList';
import CloudImage from '@/components/common/CloudImage';
import { LoadingState, ErrorState } from '@/components/common/States';
import { SeatAvailability, Stars } from '@/features/packages/components/PackageCard';
import SeatRequestForm from '@/features/packages/components/SeatRequestForm';
import CompareToggle from '@/features/packages/components/CompareToggle';
import { useCompare, compareHref } from '@/features/packages/compareStore';
import { packageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { INCLUSION_OPTIONS, ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDate, formatDistance } from '@/utils/format';
import styles from './PackageDetail.module.scss';

function HotelCard({ city, hotel }) {
  return (
    <div className="border rounded p-3 h-100">
      <div className="section-title mb-1">{city}</div>
      <div className="fw-semibold">{hotel.name}</div>
      <Stars count={hotel.stars} />
      <div className="small text-secondary mt-1">
        {hotel.nights} night(s) · {formatDistance(hotel.distanceMeters)} from the Haram
      </div>
    </div>
  );
}

/**
 * The server renders this with the package already loaded (so search engines and link
 * previews see the full page); it then refreshes in the browser for live seat counts.
 */
export default function PackageDetail({ initialPackage }) {
  const { id } = useParams();
  const { data: pkg, loading, error, reload } = useFetch(() => packageService.get(id), [id], { initialData: initialPackage });
  const { items: comparing } = useCompare();
  // How many packages this agency has listed, for the "more from this agency" link.
  const agencyId = pkg?.agency?._id;
  const { meta: agencyListing } = useFetch(
    () => (agencyId ? packageService.browse({ agencyId, limit: 1 }) : Promise.resolve(null)),
    [agencyId],
  );
  // The mobile booking bar hides while the booking card itself is on screen.
  const [bookCard, setBookCard] = useState(null);
  const [bookCardVisible, setBookCardVisible] = useState(false);
  useEffect(() => {
    if (!bookCard) return undefined;
    const observer = new IntersectionObserver(([entry]) => setBookCardVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(bookCard);
    return () => observer.disconnect();
  }, [bookCard]);

  if (loading && !pkg) return <LoadingState label="Loading package…" />;
  if (error && !pkg) {
    return (
      <>
        <ErrorState title="Package unavailable" message={error} onRetry={reload} />
        <div className="text-center">
          <Link href="/packages">← Browse all packages</Link>
        </div>
      </>
    );
  }

  const agency = pkg.agency;
  const agencyHref = agency ? `/agencies/${agency._id}` : null;
  const otherPackages = Math.max((agencyListing?.total || 0) - 1, 0);

  return (
    <div className="has-mobile-cta">
      <Link href="/packages" className="small d-inline-block mb-3">
        ← All packages
      </Link>
      <div className="mb-4">
        <header className={pkg.coverImage ? styles.hero : ''}>
          {pkg.coverImage && (
            <CloudImage
              src={pkg.coverImage.url}
              alt=""
              fill
              preload
              sizes="(min-width: 1400px) 1296px, 100vw"
              className={styles.heroImg}
            />
          )}
          <div className={pkg.coverImage ? styles.heroContent : ''}>
            <div className={`section-title mb-1 ${pkg.coverImage ? styles.heroEyebrow : ''}`}>
              {pkg.durationDays}-day Umrah package
            </div>
            <h1 className="h2 mb-1">{pkg.title}</h1>
            <p className={`mb-0 ${pkg.coverImage ? '' : 'text-secondary'}`}>
              by{' '}
              {agency ? (
                <Link href={agencyHref} className={`fw-semibold ${pkg.coverImage ? styles.heroLink : ''}`}>
                  {agency.businessName}
                </Link>
              ) : (
                <span className="fw-semibold">—</span>
              )}
              <span
                className={`badge rounded-pill ms-2 ${pkg.coverImage ? 'bg-success text-white' : 'badge-soft badge-soft-success'}`}
              >
                Verified vendor
              </span>
            </p>
          </div>
        </header>
        <div className="d-flex flex-wrap align-items-start gap-2 mt-3">
          <CompareToggle pkg={pkg} />
          {comparing.length >= 2 ? (
            <Link href={compareHref(comparing.map((x) => x._id))} className="btn btn-sm btn-outline-primary">
              Compare {comparing.length} packages →
            </Link>
          ) : (
            comparing.length === 1 && (
              <span className="small text-secondary align-self-center">
                {comparing[0]._id === pkg._id ? 'Added. ' : ''}Pick one more package to compare —{' '}
                <Link href="/packages">browse packages</Link>
              </span>
            )
          )}
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="mb-4">
            <CardBody className="p-4">
              <DetailList
                items={[
                  { label: 'Departure', value: formatDate(pkg.departureDate) },
                  { label: 'Return', value: formatDate(pkg.returnDate) },
                  { label: 'Departing from', value: pkg.departureCity },
                  { label: 'Room sharing', value: ROOM_TYPE_LABELS[pkg.roomType] },
                ]}
              />
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Hotels</h2>
              <Row className="g-3">
                <Col sm={6}>
                  <HotelCard city="Makkah" hotel={pkg.makkahHotel} />
                </Col>
                <Col sm={6}>
                  <HotelCard city="Madinah" hotel={pkg.madinahHotel} />
                </Col>
              </Row>
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">About this package</h2>
              <p className="mb-4" style={{ whiteSpace: 'pre-line' }}>
                {pkg.description}
              </p>
              <h3 className="h6 mb-2">What’s included</h3>
              <ul className="list-unstyled row g-2 mb-0">
                {INCLUSION_OPTIONS.map((o) => {
                  const included = pkg.inclusions.includes(o.value);
                  return (
                    <li key={o.value} className={`col-6 col-md-4 small ${included ? '' : 'text-secondary text-decoration-line-through'}`}>
                      <span className={included ? 'text-success me-1' : 'me-1'} aria-hidden="true">
                        {included ? '✓' : '✕'}
                      </span>
                      {o.label}
                      <span className="visually-hidden">{included ? ' (included)' : ' (not included)'}</span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          {agency && (
            <Card>
              <CardBody className="p-4">
                <h2 className="h6 section-title mb-3">About the vendor</h2>
                <DetailList
                  items={[
                    { label: 'Business', value: agency.businessName },
                    { label: 'Vendor type', value: agency.vendorTypeLabel },
                    { label: 'Based in', value: [agency.city, agency.province].filter(Boolean).join(', ') },
                    { label: 'Experience', value: agency.experience !== undefined ? `${agency.experience} years` : null },
                    { label: 'Verified since', value: formatDate(agency.verifiedSince) },
                  ]}
                />
                <Link href={agencyHref} className="btn btn-outline-primary mt-3">
                  {otherPackages > 0
                    ? `View ${otherPackages} more package${otherPackages > 1 ? 's' : ''} and reviews →`
                    : `See ${agency.businessName}’s reviews →`}
                </Link>
              </CardBody>
            </Card>
          )}
        </Col>

        <Col lg={4}>
          <Card id="book" innerRef={setBookCard} className="position-sticky" style={{ top: 88, scrollMarginTop: 88 }}>
            <CardBody className="p-4">
              <div className="h3 mb-0 text-primary">{formatCurrency(pkg.pricePerPerson)}</div>
              <div className="small text-secondary mb-3">per person · {ROOM_TYPE_LABELS[pkg.roomType]}</div>
              <div className="mb-4">
                <SeatAvailability pkg={pkg} />
              </div>
              <SeatRequestForm pkg={pkg} />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Phones and tablets: the booking card sits at the bottom of the page, so keep a shortcut in reach. */}
      <div className={`mobile-cta ${bookCardVisible ? 'd-none' : ''}`}>
        <div className="lh-sm">
          <div className="fw-bold text-primary">{formatCurrency(pkg.pricePerPerson)}</div>
          <div className="small text-secondary">per person</div>
        </div>
        <a href="#book" className="btn btn-primary px-4">
          {pkg.availableSeats > 0 ? 'Request seats' : 'Fully booked'}
        </a>
      </div>
    </div>
  );
}
