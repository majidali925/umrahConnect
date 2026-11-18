'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
import AgencyStatusGate from '@/features/agency/components/AgencyStatusGate';
import PackageForm from '@/features/packages/components/PackageForm';
import { agencyPackageService } from '@/services/package.service';

export default function NewPackagePage() {
  const router = useRouter();

  const handleSubmit = async (payload, { publish }) => {
    await agencyPackageService.create({ ...payload, status: publish ? 'PUBLISHED' : 'DRAFT' });
    router.push('/agency/packages');
  };

  return (
    <AgencyStatusGate statuses={['APPROVED']}>
      <PageHeader
        eyebrow="Packages"
        title="New package"
        subtitle="Packages can only be created for future travel dates. Customers request seats; you confirm them."
      />
      <PackageForm onSubmit={handleSubmit} />
    </AgencyStatusGate>
  );
}
