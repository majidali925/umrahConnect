import { ImageResponse } from 'next/og';
import ShareCard, { SHARE_SIZE } from '@/components/seo/ShareCard';
import { getPublicPackage } from '@/lib/publicData';
import { formatCurrency, formatDate, formatDistance } from '@/utils/format';

export const alt = 'Umrah package on UmrahConnect';
export const size = SHARE_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }) {
  const { id } = await params;
  let pkg = null;
  try {
    pkg = await getPublicPackage(id);
  } catch {
    // API unavailable: fall back to the generic card below.
  }

  if (!pkg) {
    return new ImageResponse(<ShareCard eyebrow="Umrah package" title="Compare Umrah packages from verified agencies" />, size);
  }

  return new ImageResponse(
    (
      <ShareCard
        eyebrow={`${pkg.durationDays}-day Umrah · from ${pkg.departureCity}`}
        title={pkg.title}
        facts={[
          ['Per person', formatCurrency(pkg.pricePerPerson)],
          ['Departs', formatDate(pkg.departureDate)],
          ['Makkah hotel', `${formatDistance(pkg.makkahHotel.distanceMeters)} to Haram`],
        ]}
        footer={pkg.agency ? `by ${pkg.agency.businessName} · verified vendor` : 'Verified vendor'}
      />
    ),
    size,
  );
}
