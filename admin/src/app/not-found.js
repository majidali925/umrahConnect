import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center p-4 bg-surface">
      <BrandLogo href="/dashboard" />
      <h1 className="display-5 fw-bold mt-4 mb-2">404</h1>
      <p className="text-secondary mb-4">This admin page does not exist.</p>
      <Link href="/dashboard" className="btn btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
