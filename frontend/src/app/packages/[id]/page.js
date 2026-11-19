'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardBody, Row, Col } from 'reactstrap';
import DetailList from '@/components/common/DetailList';
import { LoadingState, ErrorState } from '@/components/common/States';
import { SeatAvailability, Stars } from '@/features/packages/components/PackageCard';
import SeatRequestForm from '@/features/packages/components/SeatRequestForm';
import { packageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { INCLUSION_OPTIONS, ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDate, formatDistance } from '@/utils/format';

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

function PackageDetail() {
  const { id } = useParams();
  const { data: pkg, loading, error, reload } = useFetch(() => packageService.get(id), [id]);
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
  if (error) {
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
  const agencyHref = agency ? `/packages?agencyId=${agency._id}` : null;
  const otherPackages = Math.max((agencyListing?.total || 0) - 1, 0);

  return (
    <div className="has-mobile-cta">
      <Link href="/packages" className="small d-inline-block mb-3">
        ← All packages
      </Link>
      <div className="mb-4">
        <div className="section-title mb-1">{pkg.durationDays}-day Umrah package</div>
        <h1 className="h2 mb-1">{pkg.title}</h1>
        <p className="text-secondary mb-0">
          by{' '}
          {agency ? (
            <Link href={agencyHref} className="fw-semibold">
              {agency.businessName}
            </Link>
          ) : (
            <span className="fw-semibold text-body">—</span>
          )}
          <span className="badge rounded-pill badge-soft badge-soft-success ms-2">Verified vendor</span>
        </p>
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
                {otherPackages > 0 ? (
                  <Link href={agencyHref} className="btn btn-outline-primary mt-3">
                    View {otherPackages} more package{otherPackages > 1 ? 's' : ''} from {agency.businessName} →
                  </Link>
                ) : (
                  agencyListing && (
                    <p className="small text-secondary mt-3 mb-0">This is currently the only package from {agency.businessName}.</p>
                  )
                )}
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

export default function PackageDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PackageDetail />
    </Suspense>
  );
}
