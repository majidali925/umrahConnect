'use client';

import Link from 'next/link';
import { Card, CardBody, Row, Col } from 'reactstrap';
import PageHeader from '@/components/common/PageHeader';
import DetailList from '@/components/common/DetailList';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatPhone } from '@/utils/format';

export default function AccountPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader eyebrow="My account" title={`Assalam-o-Alaikum, ${user.fullName.split(' ')[0]}`} subtitle="Welcome to UmrahConnect." />
      <Row className="g-4">
        <Col lg={7}>
          <Card>
            <CardBody className="p-4">
              <h2 className="h6 section-title mb-3">Profile</h2>
              <DetailList
                items={[
                  { label: 'Full name', value: user.fullName },
                  { label: 'Email', value: user.email },
                  { label: 'Mobile number', value: formatPhone(user.phone) },
                  { label: 'Member since', value: formatDate(user.createdAt) },
                  { label: 'Email verified', value: user.isEmailVerified ? 'Yes' : 'No' },
                  { label: 'Mobile verified', value: user.isPhoneVerified ? 'Yes' : 'No' },
                ]}
              />
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="bg-green-light border-0 h-100">
            <CardBody className="p-4">
              <h2 className="h5">Plan your Umrah</h2>
              <p className="text-secondary">
                Browse upcoming packages from verified agencies and request seats. The agency confirms your booking
                and contacts you directly — nothing is paid online.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link href="/packages" className="btn btn-primary">
                  Browse packages
                </Link>
                <Link href="/account/quotations" className="btn btn-light border">
                  My seat requests
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
