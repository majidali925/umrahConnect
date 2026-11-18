import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';
import CurrentYear from '@/components/common/CurrentYear';

export default function SiteFooter() {
  return (
    <footer className="border-top bg-surface py-5 mt-auto">
      <div className="container">
        <div className="row g-4">
          <div className="col-md-5">
            <BrandLogo size="sm" />
            <p className="text-secondary small mt-3 mb-0" style={{ maxWidth: 360 }}>
              A trusted marketplace connecting Pakistani pilgrims with verified travel agencies and Umrah operators.
            </p>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="fw-bold">Pilgrims</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1">
                <Link href="/register">Create an account</Link>
              </li>
              <li>
                <Link href="/login">Log in</Link>
              </li>
            </ul>
          </div>
          <div className="col-6 col-md-4">
            <h6 className="fw-bold">Agencies & operators</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1">
                <Link href="/register/vendor">Register as a vendor</Link>
              </li>
              <li>
                <Link href="/#for-agencies">Verification process</Link>
              </li>
            </ul>
          </div>
        </div>
        <hr className="my-4" />
        <p className="small text-secondary mb-0">© <CurrentYear /> UmrahConnect. All rights reserved.</p>
      </div>
    </footer>
  );
}
