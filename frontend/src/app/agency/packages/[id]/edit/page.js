'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Alert } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { LoadingState, ErrorState } from '@/components/common/States';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import PackageForm from '@/features/packages/components/PackageForm';
import { agencyPackageService } from '@/services/package.service';
import { useFetch } from '@/hooks/useFetch';

function EditPackage() {
  const { id } = useParams();
  const router = useRouter();
  const photoFailed = useSearchParams().get('photo') === 'failed';
  const { data: pkg, loading, error, reload } = useFetch(() => agencyPackageService.get(id), [id]);

  if (loading && !pkg) return <LoadingState label="Loading package…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const handleSubmit = async (payload) => {
    // PUT replaces the package; keep its current publish status.
    await agencyPackageService.update(id, { ...payload, status: pkg.status });
    router.push('/agency/packages');
  };

  return (
    <>
      <PageHeader
        eyebrow="Packages"
        title={pkg.title}
        subtitle={`${pkg.bookedSeats} of ${pkg.totalSeats} seats confirmed`}
        actions={
          <>
            <StatusBadge type="package" status={pkg.isExpired ? 'EXPIRED' : pkg.status} className="fs-6 align-self-center" />
            {pkg.status === 'PUBLISHED' && !pkg.isExpired && (
              <Link href={`/packages/${pkg._id}`} className="btn btn-light border" target="_blank">
                View public page
              </Link>
            )}
            <Link href={`/agency/quotations?packageId=${pkg._id}`} className="btn btn-light border">
              Seat requests
            </Link>
          </>
        }
      />
      {photoFailed && (
        <Alert color="warning" fade={false}>
          Your package was saved, but its cover photo could not be uploaded. Please try again below.
        </Alert>
      )}
      <PackageForm initialPackage={pkg} bookedSeats={pkg.bookedSeats} onSubmit={handleSubmit} />
    </>
  );
}

export default function EditPackagePage() {
  return (
    <AgencyStatusGate statuses={['APPROVED']}>
      <Suspense fallback={<LoadingState />}>
        <EditPackage />
      </Suspense>
    </AgencyStatusGate>
  );
}
