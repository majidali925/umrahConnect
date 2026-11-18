const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const h = require('./helpers');

const BUSINESS = {
  businessName: 'Al-Noor Travels',
  ownerName: 'Ahmed Khan',
  description: 'Family-run Umrah and Hajj travel agency serving Lahore since 2010.',
  experience: 14,
  email: 'info@alnoor.example.com',
  phone: '03211234567',
  whatsapp: '03211234567',
  officePhone: '0421234567',
  website: 'https://alnoor.example.com',
  country: 'Pakistan',
  province: 'Punjab',
  city: 'Lahore',
  address: '12 Main Boulevard, Gulberg III',
  postalCode: '54000',
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

function upload(token, documentType, buffer = h.PDF, filename = 'doc.pdf', contentType = 'application/pdf') {
  return h
    .api()
    .post('/api/v1/agencies/documents')
    .set(auth(token))
    .field('documentType', documentType)
    .attach('file', buffer, { filename, contentType });
}

describe('Agency onboarding and verification', () => {
  let admin;
  let vendor;
  let agencyId;
  const docIds = {};

  before(async () => {
    await h.setupDatabase();
    admin = await h.createAdmin();
    vendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'REGISTERED_AGENCY' });
  });
  after(h.teardownDatabase);

  it('creates a DRAFT agency at vendor registration', async () => {
    assert.equal(vendor.session.agency.verificationStatus, 'DRAFT');
    const res = await h.api().get('/api/v1/agencies/me').set(auth(vendor.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.agency.vendorType, 'REGISTERED_AGENCY');
    assert.equal(res.body.data.capabilities.canSubmit, false);
    assert.deepEqual(
      res.body.data.documentRequirements.map((r) => [r.type, r.required]),
      [
        ['BUSINESS_REGISTRATION', true],
        ['TRAVEL_AGENCY_LICENSE', true],
        ['UMRAH_AUTHORIZATION', false],
      ],
    );
    agencyId = res.body.data.agency._id;
  });

  it('blocks publishing for unapproved vendors', async () => {
    const res = await h.api().get('/api/v1/agencies/publishing-access').set(auth(vendor.token));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AGENCY_NOT_APPROVED');
  });

  it('refuses to submit an incomplete application', async () => {
    const res = await h.api().post('/api/v1/agencies/onboarding').set(auth(vendor.token));
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'APPLICATION_INCOMPLETE');
    assert.ok(res.body.errors.some((e) => e.field === 'businessName'));
    assert.ok(res.body.errors.some((e) => e.field === 'documents.TRAVEL_AGENCY_LICENSE'));
  });

  it('validates onboarding fields', async () => {
    const res = await h
      .api()
      .put('/api/v1/agencies/me')
      .set(auth(vendor.token))
      .send({ province: 'Atlantis', website: 'not a url', whatsapp: '123' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['province', 'website', 'whatsapp']);
  });

  it('saves onboarding steps as a draft', async () => {
    const res = await h.api().put('/api/v1/agencies/me').set(auth(vendor.token)).send(BUSINESS);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.agency.whatsapp, '+923211234567');
    assert.equal(res.body.data.agency.officePhone, '+92421234567');
    assert.deepEqual(res.body.data.missingRequirements.fields, []);
  });

  it('rejects disallowed and spoofed files', async () => {
    const storedFiles = () => fs.readdirSync(process.env.UPLOAD_DIR, { recursive: true }).filter((f) => f.includes('.')).length;
    const before = storedFiles();
    const txt = await upload(vendor.token, 'BUSINESS_REGISTRATION', Buffer.from('hello'), 'a.txt', 'text/plain');
    assert.equal(txt.status, 400);
    assert.equal(txt.body.code, 'INVALID_FILE_TYPE');

    const spoofed = await upload(vendor.token, 'BUSINESS_REGISTRATION', Buffer.from('not really a pdf'));
    assert.equal(spoofed.status, 400);
    assert.equal(spoofed.body.code, 'INVALID_FILE_TYPE');

    const tooBig = await upload(vendor.token, 'BUSINESS_REGISTRATION', Buffer.concat([h.PDF, Buffer.alloc(6 * 1024 * 1024)]));
    assert.equal(tooBig.status, 400);
    assert.equal(tooBig.body.code, 'UPLOAD_ERROR');

    const wrongType = await upload(vendor.token, 'CNIC');
    assert.equal(wrongType.status, 400);
    assert.equal(wrongType.body.code, 'INVALID_DOCUMENT_TYPE');

    assert.equal(storedFiles(), before, 'rejected uploads must not be left on disk');
  });

  it('uploads documents without exposing storage paths', async () => {
    for (const type of ['BUSINESS_REGISTRATION', 'TRAVEL_AGENCY_LICENSE']) {
      const res = await upload(vendor.token, type);
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.data.documentUrl, undefined);
      assert.equal(res.body.data.category, type === 'BUSINESS_REGISTRATION' ? 'BUSINESS_REGISTRATION' : 'AUTHORIZATION');
      docIds[type] = res.body.data._id;
    }
    const png = await upload(vendor.token, 'UMRAH_AUTHORIZATION', h.PNG, 'auth.png', 'image/png');
    assert.equal(png.status, 201);
    docIds.UMRAH_AUTHORIZATION = png.body.data._id;
  });

  it('replaces a document when the same type is uploaded again', async () => {
    const res = await upload(vendor.token, 'UMRAH_AUTHORIZATION');
    assert.equal(res.status, 201);
    const me = await h.api().get('/api/v1/agencies/me').set(auth(vendor.token));
    assert.equal(me.body.data.documents.filter((d) => d.documentType === 'UMRAH_AUTHORIZATION').length, 1);
    docIds.UMRAH_AUTHORIZATION = res.body.data._id;
  });

  it('submits the application and locks editing', async () => {
    const res = await h.api().post('/api/v1/agencies/onboarding').set(auth(vendor.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.agency.verificationStatus, 'PENDING');

    const edit = await h.api().put('/api/v1/agencies/me').set(auth(vendor.token)).send({ city: 'Karachi' });
    assert.equal(edit.status, 403);
    assert.equal(edit.body.code, 'AGENCY_NOT_EDITABLE');
    const up = await upload(vendor.token, 'UMRAH_AUTHORIZATION');
    assert.equal(up.status, 403);
  });

  it('lets the admin list, filter and view applications', async () => {
    const dash = await h.api().get('/api/v1/admin/dashboard').set(auth(admin.token));
    assert.equal(dash.status, 200);
    assert.equal(dash.body.data.agencies.awaitingReview, 1);

    const list = await h.api().get('/api/v1/admin/agencies?status=PENDING&search=noor').set(auth(admin.token));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.meta.total, 1);

    const none = await h.api().get('/api/v1/admin/agencies?status=APPROVED').set(auth(admin.token));
    assert.equal(none.body.data.length, 0);

    const bad = await h.api().get('/api/v1/admin/agencies?status=NOPE').set(auth(admin.token));
    assert.equal(bad.status, 400);

    const detail = await h.api().get(`/api/v1/admin/agencies/${agencyId}`).set(auth(admin.token));
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.documents.length, 3);
    assert.equal(detail.body.data.actions.canApprove, true);
  });

  it('streams documents securely to the admin only', async () => {
    const url = `/api/v1/admin/agencies/${agencyId}/documents/${docIds.BUSINESS_REGISTRATION}/file`;
    const res = await h.api().get(url).set(auth(admin.token)).buffer(true);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.equal(res.headers['cache-control'], 'private, no-store');
    // Vendor tokens are not admin tokens, so the admin API does not recognise them at all.
    const vendorTry = await h.api().get(url).set(auth(vendor.token));
    assert.equal(vendorTry.status, 401);
  });

  it('requires a reason to reject', async () => {
    const res = await h.api().patch(`/api/v1/admin/agencies/${agencyId}/reject`).set(auth(admin.token)).send({});
    assert.equal(res.status, 400);
  });

  it('rejects with a reason, which the vendor can see', async () => {
    const reason = 'The travel agency license is expired. Please upload the renewed license.';
    const res = await h
      .api()
      .patch(`/api/v1/admin/agencies/${agencyId}/reject`)
      .set(auth(admin.token))
      .send({ reason });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.agency.verificationStatus, 'REJECTED');

    const status = await h.api().get('/api/v1/agencies/verification-status').set(auth(vendor.token));
    assert.equal(status.body.data.verificationStatus, 'REJECTED');
    assert.equal(status.body.data.rejectionReason, reason);
    assert.ok(h.outbox.some((m) => m.templateName === 'applicationRejected' && m.to === vendor.payload.email));
  });

  it('lets a rejected vendor update and resubmit', async () => {
    const up = await upload(vendor.token, 'TRAVEL_AGENCY_LICENSE');
    assert.equal(up.status, 201);
    docIds.TRAVEL_AGENCY_LICENSE = up.body.data._id;
    const edit = await h.api().put('/api/v1/agencies/me').set(auth(vendor.token)).send({ experience: 15 });
    assert.equal(edit.status, 200);
    const submit = await h.api().post('/api/v1/agencies/onboarding').set(auth(vendor.token));
    assert.equal(submit.status, 200);
    assert.equal(submit.body.data.agency.verificationStatus, 'PENDING');
    assert.equal(submit.body.data.agency.rejectionReason, undefined);
  });

  it('cannot approve until required documents are approved', async () => {
    const res = await h.api().patch(`/api/v1/admin/agencies/${agencyId}/approve`).set(auth(admin.token)).send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'DOCUMENTS_NOT_APPROVED');
  });

  it('reviews documents individually and moves the application under review', async () => {
    const reject = await h
      .api()
      .patch(`/api/v1/admin/agencies/${agencyId}/documents/${docIds.UMRAH_AUTHORIZATION}/review`)
      .set(auth(admin.token))
      .send({ status: 'REJECTED', reason: 'Document is unreadable, please rescan.' });
    assert.equal(reject.status, 200);
    assert.equal(reject.body.data.agency.verificationStatus, 'UNDER_REVIEW');

    for (const type of ['BUSINESS_REGISTRATION', 'TRAVEL_AGENCY_LICENSE']) {
      const res = await h
        .api()
        .patch(`/api/v1/admin/agencies/${agencyId}/documents/${docIds[type]}/review`)
        .set(auth(admin.token))
        .send({ status: 'APPROVED' });
      assert.equal(res.status, 200);
    }
  });

  it('approves the application and grants publishing access', async () => {
    const res = await h.api().patch(`/api/v1/admin/agencies/${agencyId}/approve`).set(auth(admin.token)).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.data.agency.verificationStatus, 'APPROVED');
    assert.equal(res.body.data.verificationSummary.isLicensedAgency, true);
    assert.equal(res.body.data.verificationSummary.hasUmrahAuthorization, false);

    const access = await h.api().get('/api/v1/agencies/publishing-access').set(auth(vendor.token));
    assert.equal(access.status, 200);
    assert.equal(access.body.data.canPublish, true);
  });

  it('suspends and reinstates the vendor', async () => {
    const noReason = await h.api().patch(`/api/v1/admin/agencies/${agencyId}/suspend`).set(auth(admin.token)).send({});
    assert.equal(noReason.status, 400);

    const suspend = await h
      .api()
      .patch(`/api/v1/admin/agencies/${agencyId}/suspend`)
      .set(auth(admin.token))
      .send({ reason: 'Multiple customer complaints under investigation.' });
    assert.equal(suspend.status, 200);
    assert.equal(suspend.body.data.agency.verificationStatus, 'SUSPENDED');

    const blocked = await h.api().get('/api/v1/agencies/publishing-access').set(auth(vendor.token));
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'AGENCY_SUSPENDED');

    const reinstate = await h.api().patch(`/api/v1/admin/agencies/${agencyId}/reinstate`).set(auth(admin.token));
    assert.equal(reinstate.status, 200);
    assert.equal(reinstate.body.data.agency.verificationStatus, 'APPROVED');
  });

  it('rejects invalid status transitions', async () => {
    const res = await h
      .api()
      .patch(`/api/v1/admin/agencies/${agencyId}/reject`)
      .set(auth(admin.token))
      .send({ reason: 'Trying to reject an approved agency.' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_STATUS_TRANSITION');
  });

  it('records verification actions in the audit log', async () => {
    const res = await h.api().get('/api/v1/admin/audit-logs?limit=100').set(auth(admin.token));
    assert.equal(res.status, 200);
    const actions = new Set(res.body.data.map((l) => l.action));
    for (const action of [
      'AGENCY_SUBMITTED',
      'AGENCY_REJECTED',
      'AGENCY_REVIEW_STARTED',
      'AGENCY_APPROVED',
      'AGENCY_SUSPENDED',
      'AGENCY_REINSTATED',
      'DOCUMENT_UPLOADED',
      'DOCUMENT_APPROVED',
      'DOCUMENT_REJECTED',
      'DOCUMENT_VIEWED',
    ]) {
      assert.ok(actions.has(action), `missing audit action ${action}`);
    }
    const filtered = await h.api().get('/api/v1/admin/audit-logs?action=AGENCY_APPROVED').set(auth(admin.token));
    assert.equal(filtered.body.data.length, 1);
    assert.equal(filtered.body.data[0].performedBy.role, 'SUPER_ADMIN');
  });

  it('lists users with pagination and role filter', async () => {
    const res = await h.api().get('/api/v1/admin/users?role=AGENCY&limit=1').set(auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].password, undefined);
    assert.equal(res.body.meta.limit, 1);
  });

  describe('independent operator', () => {
    let operator;
    let operatorAgencyId;
    let cnicId;

    before(async () => {
      operator = await h.registerVerified({ role: 'AGENCY', vendorType: 'INDEPENDENT_OPERATOR' });
    });

    it('requires a CNIC instead of a license', async () => {
      const me = await h.api().get('/api/v1/agencies/me').set(auth(operator.token));
      operatorAgencyId = me.body.data.agency._id;
      assert.deepEqual(
        me.body.data.documentRequirements.filter((r) => r.required).map((r) => r.type),
        ['CNIC'],
      );
      const license = await upload(operator.token, 'TRAVEL_AGENCY_LICENSE');
      assert.equal(license.status, 400);
    });

    it('cannot access another vendor’s documents', async () => {
      const res = await h
        .api()
        .get(`/api/v1/agencies/documents/${docIds.BUSINESS_REGISTRATION}/file`)
        .set(auth(operator.token));
      assert.equal(res.status, 404);
      const del = await h
        .api()
        .delete(`/api/v1/agencies/documents/${docIds.BUSINESS_REGISTRATION}`)
        .set(auth(operator.token));
      assert.equal(del.status, 404);
    });

    it('completes onboarding and is never labelled a licensed agency', async () => {
      await h
        .api()
        .put('/api/v1/agencies/me')
        .set(auth(operator.token))
        .send({ ...BUSINESS, businessName: 'Bilal Umrah Services', officePhone: '', website: '' });
      const cnic = await upload(operator.token, 'CNIC', h.PNG, 'cnic.png', 'image/png');
      assert.equal(cnic.status, 201);
      cnicId = cnic.body.data._id;
      assert.equal(cnic.body.data.category, 'IDENTITY');

      const submit = await h.api().post('/api/v1/agencies/onboarding').set(auth(operator.token));
      assert.equal(submit.status, 200);

      await h
        .api()
        .patch(`/api/v1/admin/agencies/${operatorAgencyId}/documents/${cnicId}/review`)
        .set(auth(admin.token))
        .send({ status: 'APPROVED' });
      const approve = await h
        .api()
        .patch(`/api/v1/admin/agencies/${operatorAgencyId}/approve`)
        .set(auth(admin.token))
        .send({});
      assert.equal(approve.status, 200);
      const summary = approve.body.data.verificationSummary;
      assert.equal(summary.isLicensedAgency, false);
      assert.equal(summary.vendorTypeLabel, 'Independent Umrah Operator');
      assert.equal(summary.categories.find((c) => c.category === 'IDENTITY').status, 'VERIFIED');
      assert.equal(summary.categories.find((c) => c.category === 'AUTHORIZATION').status, 'NOT_PROVIDED');
    });
  });
});
