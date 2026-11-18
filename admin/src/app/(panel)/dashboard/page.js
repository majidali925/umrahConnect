'use client';

import Link from 'next/link';
import { Card, CardBody, Row, Col, Table } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import AuditLogList from '@/features/admin/components/AuditLogList';
import { adminService } from '@/services/admin.service';
import { useFetch } from '@/hooks/useFetch';
import { AGENCY_STATUS_META, VENDOR_TYPE_LABELS } from '@/constants';
import { formatDate } from '@/utils/format';
import styles from '../panel.module.scss';

function StatCard({ label, value, hint, accent }) {
  return (
    <Card className={`h-100 ${styles.stat} ${accent ? styles.statAccent : ''}`}>
      <CardBody>
        <div className="small text-secondary fw-semibold">{label}</div>
        <div className={styles.statValue}>{value}</div>
        {hint && <div className="small text-secondary">{hint}</div>}
      </CardBody>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useFetch(() => adminService.getDashboard(), []);

  if (loading && !data) return <LoadingState label="Loading dashboard…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { users, agencies, recentApplications, recentActivity } = data;

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" subtitle="Platform activity and vendor verification at a glance." />

      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <StatCard label="Awaiting review" value={agencies.awaitingReview} hint="Pending + under review" accent />
          </Col>
        <Col xs={6} lg={3}>
          <StatCard label="Approved vendors" value={agencies.byStatus.APPROVED} hint={`${agencies.byStatus.SUSPENDED} suspended`} />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard label="Total vendors" value={agencies.total} hint={`${agencies.byStatus.DRAFT} still in draft`} />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard label="Registered users" value={users.total} hint={`${users.byRole.CUSTOMER} pilgrims`} />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="mb-4">
            <CardBody className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 section-title mb-0">Review queue</h2>
                <Link href="/agencies?status=PENDING" className="small fw-semibold">
                  View all
                </Link>
              </div>
              {recentApplications.length === 0 ? (
                <EmptyState title="All caught up" message="No applications are waiting for review." />
              ) : (
                <div className="table-responsive">
                  <Table className="mb-0" hover>
                    <thead>
                      <tr>
                        <th>Business</th>
                        <th>Submitted</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApplications.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <Link href={`/agencies/${a._id}`} className="fw-semibold">
                              {a.businessName}
                            </Link>
                            <div className="small text-secondary">
                              {VENDOR_TYPE_LABELS[a.vendorType]} · {a.city}
                            </div>
                          </td>
                          <td className="small">{formatDate(a.submittedAt)}</td>
                          <td>
                            <StatusBadge status={a.verificationStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Vendors by status</h2>
              <div className={styles.statusBars}>
                {Object.entries(agencies.byStatus).map(([status, count]) => (
                  <Link key={status} href={`/agencies?status=${status}`} className={styles.statusRow}>
                    <StatusBadge status={status} />
                    <div className={styles.bar}>
                      <span
                        className={`bg-${AGENCY_STATUS_META[status].color}`}
                        style={{ width: `${agencies.total ? (count / agencies.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="fw-semibold small">{count}</span>
                  </Link>
                ))}
              </div>
              <div className="d-flex gap-4 mt-3 small text-secondary">
                <span>Registered agencies: <strong className="text-body">{agencies.byVendorType.REGISTERED_AGENCY}</strong></span>
                <span>Independent operators: <strong className="text-body">{agencies.byVendorType.INDEPENDENT_OPERATOR}</strong></span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card>
            <CardBody className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 section-title mb-0">Recent activity</h2>
                <Link href="/audit-logs" className="small fw-semibold">
                  Audit logs
                </Link>
              </div>
              {recentActivity.length ? <AuditLogList logs={recentActivity} /> : <EmptyState title="No activity yet" />}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
