import { ImageResponse } from 'next/og';
import ShareCard, { SHARE_SIZE } from '@/components/seo/ShareCard';

export const alt = 'UmrahConnect — compare Umrah packages from verified agencies in Pakistan';
export const size = SHARE_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <ShareCard
        eyebrow="Pakistan’s verified Umrah marketplace"
        title="Compare Umrah packages from verified agencies"
        footer="Prices · hotel distance from the Haram · what’s included · request seats online"
      />
    ),
    size,
  );
}
