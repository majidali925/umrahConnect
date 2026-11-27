'use client';

import { useState } from 'react';
import { Card, CardBody, Input } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import AuditLogList from '@/features/admin/components/AuditLogList';
import { adminService } from '@/services/admin.service';
import { useFetch } from '@/hooks/useFetch';
import { AUDIT_ACTION_LABELS } from '@/constants';

const ENTITY_TYPES = ['Agency', 'AgencyDocument', 'Package', 'Quotation', 'FeatureRequest', 'User', 'Admin'];

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, meta, loading, error, reload } = useFetch(
    () => adminService.listAuditLogs({ action, entityType, page, limit: 25 }),
    [action, entityType, page],
  );

  return (
    <>
      <PageHeader eyebrow="Compliance" title="Audit logs" subtitle="A record of verification and account actions." />

      <Card className="mb-3">
        <CardBody className="d-flex flex-column flex-md-row gap-2">
          <Input
            type="select"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Input>
          <Input
            type="select"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by entity"
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Input>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-4">
          {loading && !data ? (
            <LoadingState label="Loading audit logs…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : data.length === 0 ? (
            <EmptyState title="No log entries" message="No actions match these filters." />
          ) : (
            <div style={{ opacity: loading ? 0.6 : 1 }}>
              <AuditLogList logs={data} showEntity />
            </div>
          )}
        </CardBody>
        {data && data.length > 0 && (
          <CardBody className="border-top">
            <Pagination meta={meta} onChange={setPage} />
          </CardBody>
        )}
      </Card>
    </>
  );
}
