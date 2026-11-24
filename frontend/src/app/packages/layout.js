import { baseOpenGraph } from '@/lib/site';
import SiteHeader from '@/components/layouts/SiteHeader';
import SiteFooter from '@/components/layouts/SiteFooter';

export const metadata = {
  // Package pages pick up the site suffix too.
  title: { default: 'Umrah packages from Pakistan — prices, hotels & verified agencies', template: '%s · UmrahConnect' },
  description:
    'Browse and compare Umrah packages from verified Umrah travel agencies in Pakistan. Filter by departure city, dates and price, and compare hotels, distance to the Haram and inclusions.',
  alternates: { canonical: '/packages' },
  openGraph: { ...baseOpenGraph, url: '/packages', title: 'Umrah packages from Pakistan — compare verified agencies' },
};

export default function PackagesLayout({ children }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <SiteHeader />
      <main className="container py-5 flex-grow-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
