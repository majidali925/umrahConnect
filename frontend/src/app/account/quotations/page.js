'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button, Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';
import ConfirmModal from '@/components/common/ConfirmModal';
import { StarRating } from '@/components/common/StarRating';
import ReviewModal from '@/features/packages/components/ReviewModal';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { packageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';
import { ROOM_TYPE_LABELS } from '@/constants';
import { formatCurrency, formatDate, formatDateRange, formatPhone } from '@/utils/format';

const CANCELLED_BY = {
  AGENCY: 'Cancelled by the agency',
  PLATFORM: 'Cancelled because the agency is no longer available on UmrahConnect',
};

const STATUS_HELP = {
  PENDING: 'Waiting for the agency to confirm. No seats are reserved yet.',
  CONFIRMED: 'Your seats are reserved. The agency will contact you to arrange the next steps and payment.',
  DECLINED: 'The agency could not accept this request.',
  CANCELLED: null,
};

function AgencyContact({ contact }) {
  return (
    <div className="bg-green-light rounded p-3 small mt-3">
      <div className="fw-semibold mb-1">Agency contact</div>
      {contact.phone && (
        <div>
          Phone: <a href={`tel:${contact.phone}`}>{formatPhone(contact.phone)}</a>
        </div>
      )}
      {contact.whatsapp && (
        <div>
          WhatsApp:{' '}
          <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
            {formatPhone(contact.whatsapp)}
          </a>
        </div>
      )}
      {contact.email && (
        <div>
          Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
      )}
      {contact.address && <div>Office: {contact.address}</div>}
    </div>
  );
}

export default function MyQuotationsPage() {
  const [page, setPage] = useState(1);
  const [withdrawing, setWithdrawing] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [notice, setNotice] = useState(null);
  const { data, meta, loading, error, reload } = useFetch(() => packageService.myQuotations({ page, limit: 10 }), [page]);

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title="My seat requests"
        subtitle="Track the seats you’ve requested. Agencies confirm bookings directly — nothing is paid online."
        actions={
          <>
            <Link href="/account" className="btn btn-light border">
              My profile
            </Link>
            <Link href="/packages" className="btn btn-primary">
              Browse packages
            </Link>
          </>
        }
      />

      {notice && (
        <Alert color="success" fade={false} toggle={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {loading && !data ? (
        <LoadingState label="Loading your requests…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title="No requests yet"
            message="Find a package you like and request seats — the agency will confirm with you."
            action={
              <Link href="/packages" className="btn btn-primary mt-2">
                Browse packages
              </Link>
            }
          />
        </Card>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          {data.map((q) => (
            <Card key={q._id} className="mb-3">
              <CardBody className="p-4">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div className="min-w-0">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <StatusBadge type="quotation" status={q.status} />
                      <span className="small text-secondary">Requested {formatDate(q.createdAt)}</span>
                    </div>
                    <h2 className="h6 mb-1">{q.package?.title || 'Package no longer available'}</h2>
                    <div className="small text-secondary">
                      {q.agency?.businessName}
                      {q.package && (
                        <>
                          {' · '}
                          {formatDateRange(q.package.departureDate, q.package.returnDate)} · from {q.package.departureCity} ·{' '}
                          {ROOM_TYPE_LABELS[q.package.roomType]}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-md-end">
                    <div className="h5 mb-0">{q.seats} person(s)</div>
                    <div className="small text-secondary">
                      Est. {formatCurrency(q.estimatedTotal)} ({formatCurrency(q.pricePerPerson)} each)
                    </div>
                  </div>
                </div>

                {STATUS_HELP[q.status] && <p className="small text-secondary mt-3 mb-0">{STATUS_HELP[q.status]}</p>}
                {q.status === 'CANCELLED' && (
                  <p className="small text-secondary mt-3 mb-0">
                    {CANCELLED_BY[q.cancelledBy] || 'You withdrew this request'} on{' '}
                    {formatDate(q.respondedAt)}.
                  </p>
                )}
                {q.message && (
                  <p className="small mt-2 mb-0 text-break">
                    <span className="text-secondary">Your message:</span> {q.message}
                  </p>
                )}
                {q.agencyNote && (
                  <p className="small mt-2 mb-0 text-break">
                    <span className="text-secondary">Agency note:</span> {q.agencyNote}
                  </p>
                )}
                {q.agency?.contact && <AgencyContact contact={q.agency.contact} />}

                {q.review && (
                  <div className="d-flex flex-wrap align-items-center gap-2 small mt-3">
                    <span className="text-secondary">Your review:</span>
                    <StarRating value={q.review.rating} size="sm" />
                    {q.review.comment && <span className="text-truncate min-w-0" style={{ maxWidth: '32rem' }}>“{q.review.comment}”</span>}
                  </div>
                )}
                {q.canReview && !q.review && (
                  <div className="bg-gold-light rounded p-3 small mt-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <span>
                      <strong>How was your trip?</strong> Help other travellers by rating {q.agency?.businessName || 'the agency'}.
                    </span>
                    <Button size="sm" color="primary" onClick={() => setReviewing(q)}>
                      Write a review
                    </Button>
                  </div>
                )}

                <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                  {q.package && (
                    <Link href={`/packages/${q.package._id}`} className="btn btn-sm btn-light border">
                      View package
                    </Link>
                  )}
                  {q.agency && (
                    <Link href={`/agencies/${q.agency._id}`} className="btn btn-sm btn-light border">
                      Agency page
                    </Link>
                  )}
                  {q.canReview && q.review && (
                    <Button size="sm" color="primary" outline onClick={() => setReviewing(q)}>
                      Edit review
                    </Button>
                  )}
                  {q.status === 'PENDING' && (
                    <Button size="sm" color="danger" outline onClick={() => setWithdrawing(q)}>
                      Withdraw request
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
          <Pagination meta={meta} onChange={setPage} />
        </div>
      )}

      <ReviewModal
        key={reviewing?._id || 'closed'}
        quotation={reviewing}
        onClose={() => setReviewing(null)}
        onSaved={async (message) => {
          setNotice(message);
          await reload();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(withdrawing)}
        title="Withdraw request"
        message="The agency will no longer see this as an open request. You can send a new request later if seats are still available."
        confirmLabel="Withdraw"
        confirmColor="danger"
        onConfirm={async () => {
          const res = await packageService.withdrawQuotation(withdrawing._id);
          setNotice(res.message);
          await reload();
        }}
        onClose={() => setWithdrawing(null)}
      />
    </>
  );
}
