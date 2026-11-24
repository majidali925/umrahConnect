import SiteHeader from '@/components/layouts/SiteHeader';
import SiteFooter from '@/components/layouts/SiteFooter';

export default function AgenciesLayout({ children }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <SiteHeader />
      <main className="container py-5 flex-grow-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
