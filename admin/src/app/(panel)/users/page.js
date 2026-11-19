'use client';

import { useState } from 'react';
import { Card, CardBody, Input, Table } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { adminService } from '@/services/admin.service';
import { useFetch } from '@/hooks/useFetch';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate, formatPhone } from '@/utils/format';
import { USER_ROLE_LABELS } from '@/constants';
import styles from '../panel.module.scss';

const ROLE_LABELS = USER_ROLE_LABELS;

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim());

  const { data, meta, loading, error, reload } = useFetch(
    () => adminService.listUsers({ search: debouncedSearch, role, isActive, page, limit: 20 }),
    [debouncedSearch, role, isActive, page],
  );

  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader eyebrow="Accounts" title="Users" subtitle="Everyone registered on UmrahConnect." />

      <Card className="mb-3">
        <CardBody className={styles.filters}>
          <Input type="search" placeholder="Search name, email or phone…" value={search} onChange={onFilter(setSearch)} aria-label="Search users" />
          <Input type="select" value={role} onChange={onFilter(setRole)} aria-label="Filter by role">
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Input>
          <Input type="select" value={isActive} onChange={onFilter(setIsActive)} aria-label="Filter by account state">
            <option value="">Active & inactive</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Input>
        </CardBody>
      </Card>

      <Card>
        {loading && !data ? (
          <LoadingState label="Loading users…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState title="No users found" message="Try different filters." />
        ) : (
          <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
            <Table className="mb-0 table-stack">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u._id}>
                    <td className="fw-semibold cell-title">{u.fullName}</td>
                    <td className="small" data-label="Contact">
                      <div className="min-w-0 text-break">
                        {u.email}
                        <div className="text-secondary">{formatPhone(u.phone)}</div>
                      </div>
                    </td>
                    <td data-label="Role">
                      <span className="badge rounded-pill badge-soft badge-soft-primary">{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="small" data-label="Verified">
                      {[u.isEmailVerified && 'Email', u.isPhoneVerified && 'Mobile'].filter(Boolean).join(', ') || (
                        <span className="text-warning">Unverified</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge rounded-pill badge-soft ${u.isActive ? 'badge-soft-success' : 'badge-soft-secondary'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="small" data-label="Joined">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        {data && data.length > 0 && (
          <CardBody className="border-top">
            <Pagination meta={meta} onChange={setPage} />
          </CardBody>
        )}
      </Card>
    </>
  );
}
