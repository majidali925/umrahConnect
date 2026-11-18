'use client';

import FormField from '@/components/forms/FormField';
import ChoiceCards from '@/components/forms/ChoiceCards';
import StepForm from './StepForm';
import { VENDOR_TYPE_OPTIONS, PAKISTAN_PROVINCES } from '@/constants';
import { businessInfoSchema, contactInfoSchema, addressSchema } from '@/utils/validation';

/** +923001234567 → 03001234567 for friendlier editing; the API normalizes again on save. */
const localPhone = (value) => (value ? String(value).replace(/^\+92/, '0') : '');

export function BusinessInfoStep({ agency, onSaved }) {
  return (
    <StepForm
      validationSchema={businessInfoSchema}
      initialValues={{
        businessName: agency.businessName || '',
        vendorType: agency.vendorType,
        ownerName: agency.ownerName || '',
        description: agency.description || '',
        experience: agency.experience ?? '',
      }}
      onSaved={onSaved}
    >
      <FormField name="businessName" label="Business name" placeholder="e.g. Al-Noor Travels" />
      <ChoiceCards name="vendorType" label="Vendor type" options={VENDOR_TYPE_OPTIONS} />
      <div className="row">
        <div className="col-md-8">
          <FormField name="ownerName" label="Owner name" />
        </div>
        <div className="col-md-4">
          <FormField name="experience" label="Years of experience" type="number" min={0} max={100} />
        </div>
      </div>
      <FormField
        name="description"
        label="Business description"
        type="textarea"
        rows={5}
        maxLength={2000}
        help="Tell pilgrims about your services, experience and what makes you trustworthy (30–2000 characters)."
      />
    </StepForm>
  );
}

export function ContactInfoStep({ agency, onSaved, onBack }) {
  return (
    <StepForm
      validationSchema={contactInfoSchema}
      initialValues={{
        email: agency.email || '',
        phone: localPhone(agency.phone),
        whatsapp: localPhone(agency.whatsapp),
        officePhone: localPhone(agency.officePhone),
        website: agency.website || '',
      }}
      onSaved={onSaved}
      onBack={onBack}
    >
      {({ values, setFieldValue }) => (
        <>
          <FormField name="email" label="Business email" type="email" />
          <div className="row">
            <div className="col-md-6">
              <FormField name="phone" label="Mobile number" type="tel" placeholder="0300 1234567" />
            </div>
            <div className="col-md-6">
              <FormField
                name="whatsapp"
                label="WhatsApp number"
                type="tel"
                placeholder="0300 1234567"
                help={
                  values.phone && values.whatsapp !== values.phone ? (
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setFieldValue('whatsapp', values.phone)}>
                      Same as mobile number
                    </button>
                  ) : null
                }
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <FormField name="officePhone" label="Office phone" type="tel" placeholder="042 1234567" optional />
            </div>
            <div className="col-md-6">
              <FormField name="website" label="Website" type="url" placeholder="https://" optional />
            </div>
          </div>
        </>
      )}
    </StepForm>
  );
}

export function AddressStep({ agency, onSaved, onBack }) {
  return (
    <StepForm
      validationSchema={addressSchema}
      initialValues={{
        country: agency.country || 'Pakistan',
        province: agency.province || '',
        city: agency.city || '',
        address: agency.address || '',
        postalCode: agency.postalCode || '',
      }}
      onSaved={onSaved}
      onBack={onBack}
    >
      {({ values }) => {
        const inPakistan = values.country?.trim().toLowerCase() === 'pakistan';
        return (
          <>
            <div className="row">
              <div className="col-md-6">
                <FormField name="country" label="Country" />
              </div>
              <div className="col-md-6">
                {inPakistan ? (
                  <FormField name="province" label="Province / territory" type="select" options={PAKISTAN_PROVINCES} />
                ) : (
                  <FormField name="province" label="Province / state" />
                )}
              </div>
            </div>
            <div className="row">
              <div className="col-md-8">
                <FormField name="city" label="City" placeholder="e.g. Lahore" />
              </div>
              <div className="col-md-4">
                <FormField name="postalCode" label="Postal code" inputMode="numeric" maxLength={5} optional />
              </div>
            </div>
            <FormField name="address" label="Complete office address" type="textarea" rows={3} maxLength={300} />
          </>
        );
      }}
    </StepForm>
  );
}
