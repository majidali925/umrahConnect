const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { Agency, Package, FeatureRequest } = require('../src/models');

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const DAY = 24 * 60 * 60 * 1000;
const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const PACKAGE = (overrides = {}) => ({
  title: '15 Days Economy Umrah',
  description: 'Fifteen days of Umrah with hotels close to the Haram and full transport.',
  departureCity: 'Lahore',
  departureDate: isoDay(30),
  returnDate: isoDay(44),
  makkahHotel: { name: 'Al Safwa Tower', stars: 4, distanceMeters: 300, nights: 8 },
  madinahHotel: { name: 'Pullman Zamzam', stars: 5, distanceMeters: 150, nights: 6 },
  roomType: 'QUAD',
  pricePerPerson: 350000,
  inclusions: ['VISA'],
  totalSeats: 10,
  status: 'PUBLISHED',
  ...overrides,
});

async function approvedVendor(businessName) {
  const vendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'REGISTERED_AGENCY' });
  await Agency.updateOne(
    { userId: vendor.session.user.id },
    { $set: { verificationStatus: 'APPROVED', approvedAt: new Date(), businessName, city: 'Lahore' } },
  );
  return vendor;
}

async function createPackage(vendor, overrides) {
  const res = await h.api().post('/api/v1/agencies/packages').set(auth(vendor.token)).send(PACKAGE(overrides));
  if (res.status !== 201) throw new Error(`Create failed: ${JSON.stringify(res.body)}`);
  return res.body.data._id;
}

const requestFeature = (vendor, packageId, body = {}) =>
  h.api().post(`/api/v1/agencies/packages/${packageId}/feature`).set(auth(vendor.token)).send(body);

/** Sends the application as multipart with a proof-of-payment file. */
const requestWithProof = (vendor, packageId, file = h.PNG, filename = 'payment.png') =>
  h
    .api()
    .post(`/api/v1/agencies/packages/${packageId}/feature`)
    .set(auth(vendor.token))
    .field('note', 'Paid by bank transfer')
    .attach('paymentProof', file, filename);

const browseIds = async (query = '') => (await h.api().get(`/api/v1/packages${query}`)).body.data.map((p) => p._id);

describe('Featured packages', () => {
  let vendor;
  let otherVendor;
  let customer;
  let admin;
  let early; // departs first, so it leads the default (departure) order
  let late;
  let draft;
  let requestId;

  before(async () => {
    await h.setupDatabase();
    vendor = await approvedVendor('Al-Noor Travels');
    otherVendor = await approvedVendor('Safa Tours');
    customer = await h.registerVerified();
    admin = await h.createAdmin();
    early = await createPackage(otherVendor, { title: 'Early Umrah departure', departureDate: isoDay(20), returnDate: isoDay(34) });
    late = await createPackage(vendor, { title: 'Late Umrah departure', departureDate: isoDay(40), returnDate: isoDay(54) });
    draft = await createPackage(vendor, { title: 'Draft Umrah package', status: 'DRAFT' });
  });
  after(h.teardownDatabase);

  it('shows the agency a pre-filled application for the fixed offer', async () => {
    const res = await h.api().get(`/api/v1/agencies/packages/${late}/feature`).set(auth(vendor.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.days, 7);
    assert.equal(res.body.data.price, 300);
    assert.equal(res.body.data.application.businessName, 'Al-Noor Travels');
    assert.equal(res.body.data.application.packageTitle, 'Late Umrah departure');
    assert.equal(res.body.data.application.departureCity, 'Lahore');
    assert.ok(res.body.data.application.contactName);
    assert.ok(res.body.data.daysUntilDeparture >= 39);
  });

  it('validates the request', async () => {
    const unlisted = await requestFeature(vendor, draft);
    assert.equal(unlisted.status, 400);
    assert.equal(unlisted.body.code, 'PACKAGE_NOT_LISTED');

    const notMine = await requestFeature(vendor, early);
    assert.equal(notMine.status, 404);

    const asCustomer = await requestFeature(customer, late);
    assert.equal(asCustomer.status, 403);

    const badFile = await requestWithProof(vendor, late, Buffer.from('not really a png'), 'fake.png');
    assert.equal(badFile.status, 400);
    assert.equal(badFile.body.code, 'INVALID_FILE_TYPE');
  });

  it('refuses a package that departs within a day', async () => {
    const soon = await createPackage(vendor, { title: 'Departs very soon', departureDate: isoDay(3), returnDate: isoDay(10) });
    // Departing in under 7 days is allowed (the form warns); under a day is not.
    const preview = await h.api().get(`/api/v1/agencies/packages/${soon}/feature`).set(auth(vendor.token));
    assert.equal(preview.status, 200);
    await Package.updateOne({ _id: soon }, { $set: { departureDate: new Date(Date.now() + 12 * 60 * 60 * 1000) } });
    const res = await requestFeature(vendor, soon);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'FEATURE_PAST_DEPARTURE');
    await Package.deleteOne({ _id: soon });
  });

  it('creates a pending request for 7 days at the fixed fee', async () => {
    // The length and price are fixed: anything the agency sends for them is ignored.
    const res = await requestFeature(vendor, late, { note: 'Ramadan promotion', days: 3, price: 0 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.state, 'PENDING');
    assert.equal(res.body.data.days, 7);
    assert.equal(res.body.data.price, 300);
    assert.equal(res.body.data.hasPaymentProof, false);
    requestId = res.body.data._id;

    const stored = await FeatureRequest.findById(requestId);
    assert.equal(stored.application.businessName, 'Al-Noor Travels');
    assert.equal(stored.application.pricePerPerson, 350000);

    const preview = await h.api().get(`/api/v1/agencies/packages/${late}/feature`).set(auth(vendor.token));
    assert.equal(preview.status, 409);

    const again = await requestFeature(vendor, late);
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'FEATURE_REQUEST_PENDING');

    const list = await h.api().get('/api/v1/agencies/packages').set(auth(vendor.token));
    const pkg = list.body.data.find((p) => p._id === late);
    assert.equal(pkg.featureRequest.state, 'PENDING');
    assert.equal(pkg.isFeatured, false);
  });

  it('does not feature the package before approval', async () => {
    const ids = await browseIds();
    assert.ok(ids.indexOf(early) < ids.indexOf(late));
  });

  it('lets only admins list and decide requests', async () => {
    const asVendor = await h.api().get('/api/v1/admin/feature-requests').set(auth(vendor.token));
    assert.equal(asVendor.status, 401);

    const res = await h.api().get('/api/v1/admin/feature-requests?state=PENDING').set(auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].package.title, 'Late Umrah departure');
    assert.equal(res.body.data[0].agency.businessName, 'Al-Noor Travels');
    assert.equal(res.body.data[0].actions.canApprove, true);
    assert.equal(res.body.data[0].application.businessName, 'Al-Noor Travels');
    assert.equal(res.body.meta.stateCounts.PENDING, 1);

    const search = await h.api().get('/api/v1/admin/feature-requests?search=noor').set(auth(admin.token));
    assert.equal(search.body.data.length, 1);
  });

  it('features the package on top of search results once approved', async () => {
    h.outbox.length = 0;
    const res = await h
      .api()
      .patch(`/api/v1/admin/feature-requests/${requestId}/approve`)
      .set(auth(admin.token))
      .send({ note: 'Payment received' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.state, 'ACTIVE');
    const length = new Date(res.body.data.endsAt) - new Date(res.body.data.startsAt);
    assert.equal(length, 7 * DAY);
    assert.ok(h.outbox.some((m) => m.templateName === 'featureApproved'));

    // First in the default order and in every sort, including filtered searches.
    for (const query of ['', '?sort=price_asc', '?sort=newest', '?search=umrah', '?departureCity=lahore']) {
      const ids = await browseIds(query);
      assert.equal(ids[0], late, `featured first for "${query}"`);
    }

    const list = await h.api().get('/api/v1/packages');
    const featured = list.body.data.find((p) => p._id === late);
    assert.equal(featured.isFeatured, true);
    assert.equal(featured.featuredUntil, undefined);
    assert.equal(list.body.data.find((p) => p._id === early).isFeatured, false);

    const detail = await h.api().get(`/api/v1/packages/${late}`);
    assert.equal(detail.body.data.isFeatured, true);

    const twice = await h.api().patch(`/api/v1/admin/feature-requests/${requestId}/approve`).set(auth(admin.token)).send({});
    assert.equal(twice.status, 409);
  });

  it('refuses a new request while the package is featured', async () => {
    const res = await requestFeature(vendor, late);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ALREADY_FEATURED');
  });

  it('drops the package back to its place when the featuring expires', async () => {
    await Package.updateOne({ _id: late }, { $set: { featuredUntil: new Date(Date.now() - 1000) } });
    const ids = await browseIds();
    assert.ok(ids.indexOf(early) < ids.indexOf(late));
    const pkg = (await h.api().get(`/api/v1/packages/${late}`)).body.data;
    assert.equal(pkg.isFeatured, false);
    await Package.updateOne({ _id: late }, { $set: { featuredUntil: new Date(Date.now() + DAY) } });
  });

  it('lets an admin end an active featuring early', async () => {
    const noReason = await h.api().patch(`/api/v1/admin/feature-requests/${requestId}/end`).set(auth(admin.token)).send({});
    assert.equal(noReason.status, 400);

    const res = await h
      .api()
      .patch(`/api/v1/admin/feature-requests/${requestId}/end`)
      .set(auth(admin.token))
      .send({ reason: 'Payment was not received in time' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.state, 'ENDED');
    assert.ok(res.body.data.endedEarlyAt);

    const pkg = await Package.findById(late);
    assert.equal(pkg.featuredUntil, undefined);
    const ids = await browseIds();
    assert.ok(ids.indexOf(early) < ids.indexOf(late));

    const again = await h
      .api()
      .patch(`/api/v1/admin/feature-requests/${requestId}/end`)
      .set(auth(admin.token))
      .send({ reason: 'Payment was not received in time' });
    assert.equal(again.status, 409);
  });

  it('rejects a request with a reason', async () => {
    const created = await requestFeature(vendor, late);
    assert.equal(created.status, 201);

    const noReason = await h
      .api()
      .patch(`/api/v1/admin/feature-requests/${created.body.data._id}/reject`)
      .set(auth(admin.token))
      .send({});
    assert.equal(noReason.status, 400);

    const res = await h
      .api()
      .patch(`/api/v1/admin/feature-requests/${created.body.data._id}/reject`)
      .set(auth(admin.token))
      .send({ reason: 'Payment details were not provided' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.state, 'REJECTED');

    const list = await h.api().get('/api/v1/agencies/packages').set(auth(vendor.token));
    const pkg = list.body.data.find((p) => p._id === late);
    assert.equal(pkg.featureRequest.state, 'REJECTED');
    assert.equal(pkg.featureRequest.decisionNote, 'Payment details were not provided');
    assert.equal(pkg.isFeatured, false);
  });

  it('puts requests with proof of payment first and lets admins view the proof', async () => {
    const unpaid = await requestFeature(otherVendor, early);
    assert.equal(unpaid.status, 201);
    const paid = await requestWithProof(vendor, late);
    assert.equal(paid.status, 201);
    assert.equal(paid.body.data.hasPaymentProof, true);

    const queue = await h.api().get('/api/v1/admin/feature-requests?state=PENDING').set(auth(admin.token));
    assert.deepEqual(
      queue.body.data.map((r) => r._id),
      [paid.body.data._id, unpaid.body.data._id],
    );
    const shown = queue.body.data[0];
    assert.equal(shown.hasPaymentProof, true);
    assert.equal(shown.paymentProof.originalFileName, 'payment.png');
    assert.equal(shown.paymentProof.storageKey, undefined);

    const file = await h.api().get(`/api/v1/admin/feature-requests/${shown._id}/payment-proof`).set(auth(admin.token));
    assert.equal(file.status, 200);
    assert.equal(file.headers['content-type'], 'image/png');

    const none = await h
      .api()
      .get(`/api/v1/admin/feature-requests/${unpaid.body.data._id}/payment-proof`)
      .set(auth(admin.token));
    assert.equal(none.status, 404);

    const asVendor = await h.api().get(`/api/v1/admin/feature-requests/${shown._id}/payment-proof`).set(auth(vendor.token));
    assert.equal(asVendor.status, 401);

    // Clean up so the next tests start without pending requests.
    await h.api().delete(`/api/v1/agencies/packages/${late}/feature`).set(auth(vendor.token));
    await h.api().delete(`/api/v1/agencies/packages/${early}/feature`).set(auth(otherVendor.token));
  });

  it('lets the agency withdraw a pending request', async () => {
    const created = await requestFeature(vendor, late);
    assert.equal(created.status, 201);

    const res = await h.api().delete(`/api/v1/agencies/packages/${late}/feature`).set(auth(vendor.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.state, 'CANCELLED');

    const none = await h.api().delete(`/api/v1/agencies/packages/${late}/feature`).set(auth(vendor.token));
    assert.equal(none.status, 404);
  });

  it('refuses to approve once the package is no longer listed', async () => {
    const created = await requestFeature(vendor, late);
    await h.api().patch(`/api/v1/agencies/packages/${late}/status`).set(auth(vendor.token)).send({ status: 'DRAFT' });

    const res = await h
      .api()
      .patch(`/api/v1/admin/feature-requests/${created.body.data._id}/approve`)
      .set(auth(admin.token))
      .send({});
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'PACKAGE_NOT_LISTED');
  });

  it('cancels the pending request when the package is deleted', async () => {
    const pending = await FeatureRequest.findOne({ packageId: late, status: 'PENDING' });
    const del = await h.api().delete(`/api/v1/agencies/packages/${late}`).set(auth(vendor.token));
    assert.equal(del.status, 200);
    const after = await FeatureRequest.findById(pending._id);
    assert.equal(after.status, 'CANCELLED');

    const list = await h.api().get('/api/v1/admin/feature-requests').set(auth(admin.token));
    assert.equal(list.status, 200);
    assert.ok(list.body.data.every((r) => r.packageTitle));
  });
});
