'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Formik, Form, useField, getIn } from 'formik';
import { Card, CardBody, Row, Col, FormGroup, Input, Label, Button, Spinner } from 'reactstrap';
import FormField from '@/components/forms/FormField';
import FormAlert from '@/components/forms/FormAlert';
import HotelNameField from './HotelNameField';
import { packageSchema } from '@/utils/validation';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { formatCurrency, toDateInput, tomorrowInput } from '@/utils/format';
import { ROOM_TYPE_OPTIONS, INCLUSION_OPTIONS } from '@/constants';

const STAR_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` }));

const emptyHotel = { name: '', stars: '', distanceMeters: '', nights: '' };

/** Form values for a package (or blank values for a new one). */
export function packageToValues(pkg) {
  if (!pkg) {
    return {
      title: '',
      description: '',
      departureCity: '',
      departureDate: '',
      returnDate: '',
      makkahHotel: emptyHotel,
      madinahHotel: emptyHotel,
      roomType: '',
      pricePerPerson: '',
      inclusions: ['VISA', 'HOTEL', 'TRANSPORT'],
      totalSeats: '',
    };
  }
  const hotel = (h) => ({ name: h.name, stars: h.stars, distanceMeters: h.distanceMeters, nights: h.nights });
  return {
    title: pkg.title,
    description: pkg.description,
    departureCity: pkg.departureCity,
    departureDate: toDateInput(pkg.departureDate),
    returnDate: toDateInput(pkg.returnDate),
    makkahHotel: hotel(pkg.makkahHotel),
    madinahHotel: hotel(pkg.madinahHotel),
    roomType: pkg.roomType,
    pricePerPerson: pkg.pricePerPerson,
    inclusions: pkg.inclusions || [],
    totalSeats: pkg.totalSeats,
  };
}

function InclusionCheckbox({ value, label }) {
  const [field] = useField({ name: 'inclusions', type: 'checkbox', value });
  const id = `inclusion-${value}`;
  return (
    <FormGroup check className="mb-2">
      <Input id={id} type="checkbox" {...field} />
      <Label check for={id}>
        {label}
      </Label>
    </FormGroup>
  );
}

const HARAM_NAMES = { MAKKAH: 'Masjid al-Haram', MADINAH: 'Masjid an-Nabawi' };

function HotelFields({ prefix, city, cityCode, values }) {
  // The hotel picked from the suggestions, so the distance field can say it was auto-filled.
  const [picked, setPicked] = useState(null);
  const distance = getIn(values, `${prefix}.distanceMeters`);
  const autoFilled = picked && Number(distance) === picked.distanceMeters;

  return (
    <Row className="g-3">
      <Col md={6}>
        <HotelNameField
          prefix={prefix}
          city={cityCode}
          label={`${city} hotel`}
          placeholder="e.g. Hilton Suites"
          onPick={setPicked}
        />
      </Col>
      <Col sm={4} md={2}>
        <FormField name={`${prefix}.stars`} label="Rating" type="select" options={STAR_OPTIONS} placeholder="—" className="mb-0" />
      </Col>
      <Col sm={4} md={2}>
        <FormField
          name={`${prefix}.distanceMeters`}
          label="Distance (m)"
          type="number"
          min={0}
          help={autoFilled ? `Auto-filled: straight line to ${HARAM_NAMES[cityCode]}. Adjust if needed.` : 'From the Haram'}
          className="mb-0"
        />
      </Col>
      <Col sm={4} md={2}>
        <FormField name={`${prefix}.nights`} label="Nights" type="number" min={0} className="mb-0" />
      </Col>
    </Row>
  );
}

/**
 * Create/edit form for a package. `onSubmit(payload, { publish })` must return a promise.
 * A new package can be saved as a draft or published straight away; an existing package
 * keeps its status (publish/unpublish lives on the package list).
 */
export default function PackageForm({ initialPackage, bookedSeats = 0, onSubmit, cancelHref = '/agency/packages' }) {
  const isEdit = Boolean(initialPackage);
  const [error, setError] = useState(null);
  const publishIntent = useRef(false);
  const datesLocked = isEdit && bookedSeats > 0;

  const handleSubmit = async (values, { setErrors }) => {
    setError(null);
    const cast = packageSchema.cast(values, { stripUnknown: true });
    // Send dates as plain YYYY-MM-DD so they are stored as that calendar day (UTC midnight),
    // not shifted by the browser's timezone.
    const payload = { ...cast, departureDate: values.departureDate, returnDate: values.returnDate };
    try {
      await onSubmit(payload, { publish: publishIntent.current });
    } catch (err) {
      if (!applyServerErrors(err, setErrors)) setError(getErrorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Formik
      initialValues={packageToValues(initialPackage)}
      validationSchema={packageSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, isSubmitting, submitForm }) => {
        const nights = Number(values.makkahHotel.nights || 0) + Number(values.madinahHotel.nights || 0);
        const submitAs = (publish) => {
          publishIntent.current = publish;
          submitForm();
        };
        return (
          <Form noValidate>
            <FormAlert message={error} onDismiss={() => setError(null)} />

            <Card className="mb-4">
              <CardBody className="p-4">
                <h2 className="h6 section-title mb-3">Package details</h2>
                <FormField name="title" label="Package title" placeholder="e.g. 15 Days Economy Umrah — December" />
                <FormField
                  name="description"
                  label="Description"
                  type="textarea"
                  rows={5}
                  placeholder="What makes this package special, the itinerary, flight details, group size…"
                />
                <Row className="g-3">
                  <Col md={4}>
                    <FormField name="departureCity" label="Departure city" placeholder="e.g. Lahore" />
                  </Col>
                  <Col sm={6} md={4}>
                    <FormField
                      name="departureDate"
                      label="Departure date"
                      type="date"
                      min={tomorrowInput()}
                      disabled={datesLocked}
                    />
                  </Col>
                  <Col sm={6} md={4}>
                    <FormField
                      name="returnDate"
                      label="Return date"
                      type="date"
                      min={values.departureDate || tomorrowInput()}
                      disabled={datesLocked}
                    />
                  </Col>
                </Row>
                {datesLocked && (
                  <p className="small text-secondary mb-0">
                    Travel dates are locked because {bookedSeats} seat(s) have already been confirmed.
                  </p>
                )}
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-baseline mb-3">
                  <h2 className="h6 section-title mb-0">Hotels</h2>
                  <span className="small text-secondary">{nights} night(s) in total</span>
                </div>
                <HotelFields prefix="makkahHotel" city="Makkah" cityCode="MAKKAH" values={values} />
                <hr className="my-4" />
                <HotelFields prefix="madinahHotel" city="Madinah" cityCode="MADINAH" values={values} />
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody className="p-4">
                <h2 className="h6 section-title mb-3">Price & seats</h2>
                <Row className="g-3">
                  <Col md={4}>
                    <FormField name="roomType" label="Room sharing" type="select" options={ROOM_TYPE_OPTIONS} />
                  </Col>
                  <Col sm={6} md={4}>
                    <FormField
                      name="pricePerPerson"
                      label="Price per person (PKR)"
                      type="number"
                      min={1000}
                      help={values.pricePerPerson ? formatCurrency(values.pricePerPerson) : 'Shown to customers as a quotation basis'}
                    />
                  </Col>
                  <Col sm={6} md={4}>
                    <FormField
                      name="totalSeats"
                      label="Seat quota (persons)"
                      type="number"
                      min={Math.max(bookedSeats, 1)}
                      help={bookedSeats ? `${bookedSeats} already confirmed` : 'Maximum number of persons'}
                    />
                  </Col>
                </Row>
                <Label className="mt-2">What’s included</Label>
                <Row>
                  {INCLUSION_OPTIONS.map((o) => (
                    <Col key={o.value} xs={6} md={3}>
                      <InclusionCheckbox value={o.value} label={o.label} />
                    </Col>
                  ))}
                </Row>
              </CardBody>
            </Card>

            <div className="action-bar">
              <Link href={cancelHref} className="btn btn-light border">
                Cancel
              </Link>
              {isEdit ? (
                <Button color="primary" type="button" disabled={isSubmitting} onClick={() => submitAs(false)}>
                  {isSubmitting && <Spinner size="sm" className="me-2" />}
                  Save changes
                </Button>
              ) : (
                <>
                  <Button
                    color="primary"
                    outline
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => submitAs(false)}
                  >
                    Save as draft
                  </Button>
                  <Button color="primary" type="button" disabled={isSubmitting} onClick={() => submitAs(true)}>
                    {isSubmitting && <Spinner size="sm" className="me-2" />}
                    Publish package
                  </Button>
                </>
              )}
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
