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
              Compare Umrah packages from verified Umrah travel agencies across Pakistan — prices, hotels near the Haram
              and what is included, in one place.
            </p>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="fw-bold">Pilgrims</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1">
                <Link href="/packages">Browse Umrah packages</Link>
              </li>
              <li className="mb-1">
                <Link href="/#faq">Umrah booking FAQ</Link>
              </li>
              <li className="mb-1">
                <Link href="/register">Create an account</Link>
              </li>
              <li>
                <Link href="/login">Log in</Link>
              </li>
            </ul>
          </div>
          <div className="col-6 col-md-4">
            <h6 className="fw-bold">For Umrah agencies</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1">
                <Link href="/register/vendor">Register your agency</Link>
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
