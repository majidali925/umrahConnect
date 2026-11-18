'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Formik, Form } from 'formik';
import FormField from '@/components/forms/FormField';
import FormAlert from '@/components/forms/FormAlert';
import SubmitButton from '@/components/forms/SubmitButton';
import { useAuth } from '@/hooks/useAuth';
import { packageService } from '@/services/package.service';
import { seatRequestSchema } from '@/utils/validation';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { ROLES } from '@/constants';

/**
 * Lets a signed-in customer request seats. Nothing is paid online: the request goes to the
 * agency, which confirms it and contacts the customer.
 */
export default function SeatRequestForm({ pkg }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  if (status === 'idle' || status === 'loading') return null;

  if (pkg.availableSeats === 0) {
    return <p className="mb-0 fw-semibold text-danger">This package is fully booked.</p>;
  }

  if (!user) {
    return (
      <>
        <p className="small text-secondary">Log in or create a free customer account to request seats on this package.</p>
        <div className="d-grid gap-2">
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary">
            Log in to request seats
          </Link>
          <Link href="/register" className="btn btn-light border">
            Create an account
          </Link>
        </div>
      </>
    );
  }

  if (user.role !== ROLES.CUSTOMER) {
    return <p className="small text-secondary mb-0">Seat requests can only be sent from a customer account.</p>;
  }

  if (sent) {
    return (
      <div role="status">
        <div className="fw-semibold text-success mb-1">Request sent</div>
        <p className="small text-secondary">
          Your request for {sent.seats} seat(s) has been sent to {pkg.agency?.businessName}. You’ll get an email when they
          respond. Once confirmed, you’ll see their contact details in your account.
        </p>
        <Link href="/account/quotations" className="btn btn-primary w-100">
          View my requests
        </Link>
      </div>
    );
  }

  const handleSubmit = async (values, { setErrors }) => {
    setError(null);
    try {
      const res = await packageService.requestSeats(pkg._id, {
        seats: Number(values.seats),
        message: values.message.trim(),
      });
      setSent(res.data);
    } catch (err) {
      if (!applyServerErrors(err, setErrors)) setError(getErrorMessage(err));
    }
  };

  return (
    <Formik
      initialValues={{ seats: 1, message: '' }}
      validationSchema={seatRequestSchema(pkg.availableSeats)}
      onSubmit={handleSubmit}
    >
      {({ values, isSubmitting }) => {
        const seats = Number(values.seats) || 0;
        return (
          <Form noValidate>
            <FormAlert message={error} onDismiss={() => setError(null)} />
            <FormField
              name="seats"
              label="Number of persons"
              type="number"
              min={1}
              max={pkg.availableSeats}
              help={`Up to ${pkg.availableSeats} available`}
            />
            <FormField
              name="message"
              label="Message to the agency"
              type="textarea"
              rows={3}
              optional
              placeholder="e.g. Two adults and one child, prefer a room on a lower floor."
              maxLength={1000}
            />
            <div className="d-flex justify-content-between align-items-baseline border-top pt-3 mb-3">
              <span className="small text-secondary">Estimated total</span>
              <span className="fw-bold">{seats > 0 ? formatCurrency(seats * pkg.pricePerPerson) : '—'}</span>
            </div>
            <SubmitButton loading={isSubmitting} loadingText="Sending…" block>
              Request seats
            </SubmitButton>
            <p className="small text-secondary mt-2 mb-0">
              No payment is taken online. The agency confirms your seats and contacts you directly.
            </p>
          </Form>
        );
      }}
    </Formik>
  );
}
