import DetailList from '@/components/common/DetailList';
import { VENDOR_TYPE_LABELS } from '@/constants';
import { formatPhone } from '@/utils/format';

/** Read-only sections of an agency application, used for review and profile pages. */
export function businessItems(agency) {
  return [
    { label: 'Business name', value: agency.businessName },
    { label: 'Vendor type', value: VENDOR_TYPE_LABELS[agency.vendorType] },
    { label: 'Owner name', value: agency.ownerName },
    { label: 'Years of experience', value: agency.experience },
  ];
}

export function contactItems(agency) {
  return [
    { label: 'Business email', value: agency.email },
    { label: 'Mobile number', value: agency.phone && formatPhone(agency.phone) },
    { label: 'WhatsApp', value: agency.whatsapp && formatPhone(agency.whatsapp) },
    { label: 'Office phone', value: agency.officePhone && formatPhone(agency.officePhone) },
    {
      label: 'Website',
      value: agency.website && (
        <a href={agency.website} target="_blank" rel="noopener noreferrer nofollow">
          {agency.website}
        </a>
      ),
    },
  ];
}

export function addressItems(agency) {
  return [
    { label: 'Country', value: agency.country },
    { label: 'Province', value: agency.province },
    { label: 'City', value: agency.city },
    { label: 'Postal code', value: agency.postalCode },
    { label: 'Office address', value: agency.address },
  ];
}

export default function ApplicationSummary({ agency }) {
  return (
    <>
      <h3 className="h6 section-title mb-3">Business information</h3>
      <DetailList items={businessItems(agency)} />
      {agency.description && <p className="text-secondary mb-4" style={{ whiteSpace: 'pre-line' }}>{agency.description}</p>}
      <h3 className="h6 section-title mb-3">Contact information</h3>
      <DetailList items={contactItems(agency)} />
      <h3 className="h6 section-title mb-3 mt-2">Business address</h3>
      <DetailList items={addressItems(agency)} />
    </>
  );
}
