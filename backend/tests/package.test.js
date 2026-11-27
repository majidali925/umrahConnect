const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { Agency, Package } = require('../src/models');

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const DAY = 24 * 60 * 60 * 1000;
const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const PACKAGE = () => ({
  title: '15 Days Economy Umrah',
  description: 'Fifteen days of Umrah with hotels close to the Haram and full transport.',
  departureCity: 'Lahore',
  departureDate: isoDay(30),
  returnDate: isoDay(44),
  makkahHotel: { name: 'Al Safwa Tower', stars: 4, distanceMeters: 300, nights: 8 },
  madinahHotel: { name: 'Pullman Zamzam', stars: 5, distanceMeters: 150, nights: 6 },
  roomType: 'QUAD',
  pricePerPerson: 350000,
  inclusions: ['VISA', 'FLIGHTS', 'HOTEL', 'TRANSPORT'],
  totalSeats: 5,
});

async function approvedVendor() {
  const vendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'REGISTERED_AGENCY' });
  await Agency.updateOne(
    { userId: vendor.session.user.id },
    {
      $set: {
        verificationStatus: 'APPROVED',
        approvedAt: new Date(),
        businessName: 'Al-Noor Travels',
        email: 'info@alnoor.example.com',
        phone: '+923211234567',
        whatsapp: '+923211234567',
        description: 'Family-run Umrah travel agency.',
        experience: 10,
        province: 'Punjab',
        city: 'Lahore',
        address: '12 Main Boulevard, Gulberg III',
      },
    },
  );
  return vendor;
}

describe('Packages and seat requests', () => {
  let vendor;
  let otherVendor;
  let draftVendor;
  let customer;
  let customer2;
  let packageId;

  before(async () => {
    await h.setupDatabase();
    vendor = await approvedVendor();
    otherVendor = await approvedVendor();
    draftVendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'INDEPENDENT_OPERATOR' });
    customer = await h.registerVerified();
    customer2 = await h.registerVerified();
  });
  after(h.teardownDatabase);

  describe('agency package management', () => {
    it('refuses packages from agencies that are not approved', async () => {
      const res = await h.api().post('/api/v1/agencies/packages').set(auth(draftVendor.token)).send(PACKAGE());
      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'AGENCY_NOT_APPROVED');
    });

    it('rejects past departure dates and return before departure', async () => {
      const past = await h
        .api()
        .post('/api/v1/agencies/packages')
        .set(auth(vendor.token))
        .send({ ...PACKAGE(), departureDate: isoDay(-1), returnDate: isoDay(5) });
      assert.equal(past.status, 400);
      assert.ok(past.body.errors.some((e) => e.field === 'departureDate'));

      const today = await h
        .api()
        .post('/api/v1/agencies/packages')
        .set(auth(vendor.token))
        .send({ ...PACKAGE(), departureDate: isoDay(0), returnDate: isoDay(5) });
      assert.equal(today.status, 400);

      const backwards = await h
        .api()
        .post('/api/v1/agencies/packages')
        .set(auth(vendor.token))
        .send({ ...PACKAGE(), returnDate: isoDay(10) });
      assert.equal(backwards.status, 400);
      assert.ok(backwards.body.errors.some((e) => e.field === 'returnDate'));

      // Cross-field rules have no field name, so their text must be the response message.
      const tooFar = await h
        .api()
        .post('/api/v1/agencies/packages')
        .set(auth(vendor.token))
        .send({ ...PACKAGE(), departureDate: isoDay(800), returnDate: isoDay(814) });
      assert.equal(tooFar.status, 400);
      assert.equal(tooFar.body.message, 'Departure date must be within the next two years');
    });

    it('creates a draft package that is not public', async () => {
      const res = await h.api().post('/api/v1/agencies/packages').set(auth(vendor.token)).send(PACKAGE());
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'DRAFT');
      assert.equal(res.body.data.availableSeats, 5);
      assert.equal(res.body.data.durationDays, 15);
      packageId = res.body.data._id;

      const pub = await h.api().get(`/api/v1/packages/${packageId}`);
      assert.equal(pub.status, 404);
    });

    it('hides a package from other agencies', async () => {
      const res = await h.api().get(`/api/v1/agencies/packages/${packageId}`).set(auth(otherVendor.token));
      assert.equal(res.status, 404);
      const del = await h.api().delete(`/api/v1/agencies/packages/${packageId}`).set(auth(otherVendor.token));
      assert.equal(del.status, 404);
    });

    it('updates and publishes the package', async () => {
      const upd = await h
        .api()
        .put(`/api/v1/agencies/packages/${packageId}`)
        .set(auth(vendor.token))
        .send({ ...PACKAGE(), title: '15 Days Premium Umrah' });
      assert.equal(upd.status, 200);
      assert.equal(upd.body.data.title, '15 Days Premium Umrah');

      const pub = await h
        .api()
        .patch(`/api/v1/agencies/packages/${packageId}/status`)
        .set(auth(vendor.token))
        .send({ status: 'PUBLISHED' });
      assert.equal(pub.status, 200);
      assert.equal(pub.body.data.status, 'PUBLISHED');

      const list = await h.api().get('/api/v1/agencies/packages').set(auth(vendor.token));
      assert.equal(list.body.data.length, 1);
    });
  });

  describe('public catalogue', () => {
    it('lists published upcoming packages with public agency info only', async () => {
      const res = await h.api().get('/api/v1/packages');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      const pkg = res.body.data[0];
      assert.equal(pkg.agency.businessName, 'Al-Noor Travels');
      assert.equal(pkg.agency.phone, undefined);
      assert.equal(pkg.createdBy, undefined);

      assert.equal(pkg.description, undefined, 'listing omits the long description');

      const search = await h.api().get('/api/v1/packages').query({ search: 'zamzam' });
      assert.equal(search.body.data.length, 1);
      // Every word must match somewhere, in any order, including the agency's name.
      const words = await h.api().get('/api/v1/packages').query({ search: 'safwa  LAHORE' });
      assert.equal(words.body.data.length, 1);
      const byAgency = await h.api().get('/api/v1/packages').query({ search: 'al-noor premium' });
      assert.equal(byAgency.body.data.length, 1);
      const partial = await h.api().get('/api/v1/packages').query({ search: 'lahore karachi' });
      assert.equal(partial.body.data.length, 0);

      const counts = await h.api().get('/api/v1/packages/departure-cities/counts');
      assert.equal(counts.status, 200);
      assert.deepEqual(counts.body.data, { total: 1, cities: [{ city: 'Lahore', count: 1 }] });
      const none = await h.api().get('/api/v1/packages').query({ maxPrice: 1000 });
      assert.equal(none.body.data.length, 0);
    });

    it("filters by agency, showing only an approved agency's public packages", async () => {
      const agencyId = (await Agency.findOne({ userId: vendor.session.user.id }))._id.toString();
      const own = await h.api().get('/api/v1/packages').query({ agencyId });
      assert.equal(own.status, 200);
      assert.deepEqual(own.body.data.map((p) => p._id), [packageId]);

      const otherId = (await Agency.findOne({ userId: otherVendor.session.user.id }))._id.toString();
      const other = await h.api().get('/api/v1/packages').query({ agencyId: otherId });
      assert.equal(other.body.data.length, 0);

      const unapprovedId = (await Agency.findOne({ userId: draftVendor.session.user.id }))._id.toString();
      const unapproved = await h.api().get('/api/v1/packages').query({ agencyId: unapprovedId });
      assert.equal(unapproved.body.data.length, 0);

      const bad = await h.api().get('/api/v1/packages').query({ agencyId: 'not-an-id' });
      assert.equal(bad.status, 400);
    });

    it('hides packages of suspended agencies', async () => {
      await Agency.updateOne({ userId: vendor.session.user.id }, { $set: { verificationStatus: 'SUSPENDED' } });
      const res = await h.api().get('/api/v1/packages');
      assert.equal(res.body.data.length, 0);
      await Agency.updateOne({ userId: vendor.session.user.id }, { $set: { verificationStatus: 'APPROVED' } });
    });
  });

  describe('seat requests', () => {
    let q1;
    let q2;

    it('requires a signed-in customer', async () => {
      const anon = await h.api().post(`/api/v1/packages/${packageId}/quotations`).send({ seats: 2 });
      assert.equal(anon.status, 401);
      const asAgency = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(otherVendor.token))
        .send({ seats: 2 });
      assert.equal(asAgency.status, 403);
    });

    it('refuses more seats than the quota allows', async () => {
      const res = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(customer.token))
        .send({ seats: 6 });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'NOT_ENOUGH_SEATS');
    });

    it('creates a pending request and notifies the agency', async () => {
      const res = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(customer.token))
        .send({ seats: 3, message: 'Family of three' });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.estimatedTotal, 3 * 350000);
      q1 = res.body.data._id;
      assert.ok(h.outbox.some((m) => m.templateName === 'quotationRequested' && m.to === 'info@alnoor.example.com'));

      const dup = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(customer.token))
        .send({ seats: 1 });
      assert.equal(dup.status, 409);
      assert.equal(dup.body.code, 'QUOTATION_ALREADY_PENDING');

      const second = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(customer2.token))
        .send({ seats: 3 });
      assert.equal(second.status, 201);
      q2 = second.body.data._id;
    });

    it('does not let a customer confirm their own request', async () => {
      const res = await h.api().patch(`/api/v1/agencies/quotations/${q1}/confirm`).set(auth(customer.token)).send({});
      assert.equal(res.status, 403);
    });

    it('hides contact details until confirmation', async () => {
      const res = await h.api().get('/api/v1/quotations').set(auth(customer.token));
      assert.equal(res.body.data[0].agency.contact, undefined);
    });

    it('lets the agency confirm, reserving seats against the quota', async () => {
      const other = await h.api().patch(`/api/v1/agencies/quotations/${q1}/confirm`).set(auth(otherVendor.token)).send({});
      assert.equal(other.status, 404);

      const res = await h
        .api()
        .patch(`/api/v1/agencies/quotations/${q1}/confirm`)
        .set(auth(vendor.token))
        .send({ note: 'We will call you tomorrow' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'CONFIRMED');
      assert.equal((await Package.findById(packageId)).bookedSeats, 3);

      const again = await h.api().patch(`/api/v1/agencies/quotations/${q1}/confirm`).set(auth(vendor.token)).send({});
      assert.equal(again.status, 409);

      const mine = await h.api().get('/api/v1/quotations').set(auth(customer.token));
      assert.equal(mine.body.data[0].agency.contact.phone, '+923211234567');
    });

    it('never confirms beyond the quota', async () => {
      const res = await h.api().patch(`/api/v1/agencies/quotations/${q2}/confirm`).set(auth(vendor.token)).send({});
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'NOT_ENOUGH_SEATS');
      assert.equal((await Package.findById(packageId)).bookedSeats, 3);
    });

    it('protects confirmed bookings when editing the package', async () => {
      const lowQuota = await h
        .api()
        .put(`/api/v1/agencies/packages/${packageId}`)
        .set(auth(vendor.token))
        .send({ ...PACKAGE(), totalSeats: 2 });
      assert.equal(lowQuota.status, 400);
      assert.equal(lowQuota.body.code, 'QUOTA_BELOW_BOOKED');

      const pkg = await Package.findById(packageId);
      const newDates = await h
        .api()
        .put(`/api/v1/agencies/packages/${packageId}`)
        .set(auth(vendor.token))
        .send({
          ...PACKAGE(),
          departureDate: isoDay(60),
          returnDate: isoDay(70),
          totalSeats: pkg.totalSeats,
        });
      assert.equal(newDates.status, 409);
      assert.equal(newDates.body.code, 'DATES_LOCKED');

      const del = await h.api().delete(`/api/v1/agencies/packages/${packageId}`).set(auth(vendor.token));
      assert.equal(del.status, 409);
    });

    it('lets the agency decline with a reason and the customer withdraw pending requests only', async () => {
      const decline = await h
        .api()
        .patch(`/api/v1/agencies/quotations/${q2}/decline`)
        .set(auth(vendor.token))
        .send({ reason: 'Not enough seats left on this departure.' });
      assert.equal(decline.status, 200);
      assert.equal(decline.body.data.status, 'DECLINED');

      const withdrawConfirmed = await h.api().patch(`/api/v1/quotations/${q1}/cancel`).set(auth(customer.token));
      assert.equal(withdrawConfirmed.status, 409);

      const otherCustomer = await h.api().patch(`/api/v1/quotations/${q1}/cancel`).set(auth(customer2.token));
      assert.equal(otherCustomer.status, 404);
    });

    it('lets the agency cancel a confirmed booking, releasing the seats', async () => {
      const res = await h
        .api()
        .patch(`/api/v1/agencies/quotations/${q1}/cancel`)
        .set(auth(vendor.token))
        .send({ reason: 'Flight cancelled' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'CANCELLED');
      assert.equal((await Package.findById(packageId)).bookedSeats, 0);

      const list = await h.api().get('/api/v1/agencies/quotations').set(auth(vendor.token));
      assert.equal(list.body.data.length, 2);
      assert.equal(list.body.data[0].customer.email !== undefined, true);
    });

    it('rejects a concurrent duplicate request with the pending-request conflict', async () => {
      const send = () =>
        h.api().post(`/api/v1/packages/${packageId}/quotations`).set(auth(customer2.token)).send({ seats: 1 });
      const results = await Promise.all([send(), send(), send()]);
      const created = results.filter((r) => r.status === 201);
      assert.equal(created.length, 1);
      for (const r of results.filter((x) => x.status !== 201)) {
        assert.equal(r.status, 409);
        assert.equal(r.body.code, 'QUOTATION_ALREADY_PENDING');
      }
      const withdraw = await h
        .api()
        .patch(`/api/v1/quotations/${created[0].body.data._id}/cancel`)
        .set(auth(customer2.token));
      assert.equal(withdraw.status, 200);
    });

    it('cancels pending requests without emailing customers when the admin suspends the agency', async () => {
      const admin = await h.createAdmin();
      const pending = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(customer2.token))
        .send({ seats: 1 });
      assert.equal(pending.status, 201);

      const agencyId = (await Agency.findOne({ userId: vendor.session.user.id }))._id.toString();
      const emailsBefore = h.outbox.length;
      const suspend = await h
        .api()
        .patch(`/api/v1/admin/agencies/${agencyId}/suspend`)
        .set(auth(admin.token))
        .send({ reason: 'Customer complaints under investigation.' });
      assert.equal(suspend.status, 200);

      const mine = await h.api().get('/api/v1/quotations').set(auth(customer2.token));
      const cancelled = mine.body.data.find((q) => q._id === pending.body.data._id);
      assert.equal(cancelled.status, 'CANCELLED');
      assert.equal(cancelled.cancelledBy, 'PLATFORM');
      assert.ok(!h.outbox.slice(emailsBefore).some((m) => m.to === customer2.payload.email));

      // The admin sees what disabling hid: the package stays published, nothing is pending.
      assert.deepEqual(suspend.body.data.packageStats, { total: 1, listed: 1, pendingRequests: 0 });

      const log = suspend.body.data.auditLogs.find((l) => l.action === 'AGENCY_SUSPENDED');
      assert.equal(log.metadata.cancelledRequests, 1);

      const reinstate = await h.api().patch(`/api/v1/admin/agencies/${agencyId}/reinstate`).set(auth(admin.token));
      assert.equal(reinstate.status, 200);
    });

    it('deletes a package once nothing is pending or confirmed', async () => {
      const del = await h.api().delete(`/api/v1/agencies/packages/${packageId}`).set(auth(vendor.token));
      assert.equal(del.status, 200);
      assert.equal(await Package.countDocuments({ _id: packageId }), 0);
    });
  });
});
