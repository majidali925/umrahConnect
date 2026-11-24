const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { Agency, Package } = require('../src/models');
const storage = require('../src/services/storage.service');

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const DAY = 24 * 60 * 60 * 1000;
const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const PACKAGE = () => ({
  title: '10 Days Family Umrah',
  description: 'Ten days of Umrah with hotels close to the Haram and full transport.',
  departureCity: 'Karachi',
  departureDate: isoDay(20),
  returnDate: isoDay(29),
  makkahHotel: { name: 'Swissotel Makkah', stars: 5, distanceMeters: 100, nights: 5 },
  madinahHotel: { name: 'Anwar Al Madinah', stars: 5, distanceMeters: 80, nights: 4 },
  roomType: 'TRIPLE',
  pricePerPerson: 420000,
  inclusions: ['VISA', 'HOTEL'],
  totalSeats: 10,
  status: 'PUBLISHED',
});

const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(8)]);

async function approvedVendor(businessName) {
  const vendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'REGISTERED_AGENCY' });
  await Agency.updateOne(
    { userId: vendor.session.user.id },
    {
      $set: {
        verificationStatus: 'APPROVED',
        approvedAt: new Date(),
        businessName,
        description: 'Family-run Umrah specialists since 2005.',
        email: 'contact@vendor.example.com',
        phone: '+923001112233',
        address: '12 Mall Road',
        city: 'Karachi',
      },
    },
  );
  vendor.agency = await Agency.findOne({ userId: vendor.session.user.id });
  return vendor;
}

/** Replaces Cloudinary with an in-memory fake that records what was stored and deleted. */
function fakeImageStorage() {
  const original = { saveImage: storage.saveImage, deleteImage: storage.deleteImage };
  const state = { saved: [], deleted: [] };
  storage.saveImage = async (_buffer, { folder }) => {
    const publicId = `umrahconnect/${folder}/img${state.saved.length + 1}`;
    state.saved.push(publicId);
    return { url: `https://res.cloudinary.com/demo/image/upload/v1/${publicId}`, publicId };
  };
  storage.deleteImage = async (publicId) => {
    if (publicId) state.deleted.push(publicId);
  };
  state.restore = () => Object.assign(storage, original);
  return state;
}

describe('Agency pages, photos and reviews', () => {
  let vendor;
  let otherVendor;
  let draftVendor;
  let customer;
  let stranger;
  let packageId;
  let quotationId;

  before(async () => {
    await h.setupDatabase();
    vendor = await approvedVendor('Al-Huda Travels');
    otherVendor = await approvedVendor('Other Travels');
    draftVendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'REGISTERED_AGENCY' });
    customer = await h.registerVerified({ fullName: 'Ahmed Raza Khan' });
    stranger = await h.registerVerified();

    const pkg = await h.api().post('/api/v1/agencies/packages').set(auth(vendor.token)).send(PACKAGE());
    packageId = pkg.body.data._id;
  });
  after(h.teardownDatabase);

  describe('photos', () => {
    let fake;
    afterEach(() => fake?.restore());

    const upload = (token, url, buffer, filename, contentType) =>
      h.api().put(url).set(auth(token)).attach('image', buffer, { filename, contentType });

    it('reports image uploads as unavailable without Cloudinary', async () => {
      const res = await upload(vendor.token, '/api/v1/agencies/me/header-image', h.PNG, 'a.png', 'image/png');
      assert.equal(res.status, 503);
      assert.equal(res.body.code, 'STORAGE_UNAVAILABLE');
    });

    it('rejects wrong, spoofed, missing and oversized photos', async () => {
      fake = fakeImageStorage();
      const url = '/api/v1/agencies/me/header-image';
      const pdf = await upload(vendor.token, url, h.PDF, 'a.pdf', 'application/pdf');
      assert.equal(pdf.status, 400);
      assert.equal(pdf.body.code, 'INVALID_FILE_TYPE');

      const spoofed = await upload(vendor.token, url, Buffer.from('not an image at all'), 'a.jpg', 'image/jpeg');
      assert.equal(spoofed.status, 400);
      assert.equal(spoofed.body.code, 'INVALID_FILE_TYPE');

      const none = await h.api().put(url).set(auth(vendor.token));
      assert.equal(none.status, 400);
      assert.equal(none.body.code, 'FILE_REQUIRED');

      const tooBig = await upload(vendor.token, url, Buffer.concat([h.PNG, Buffer.alloc(5 * 1024 * 1024)]), 'big.png', 'image/png');
      assert.equal(tooBig.status, 400);
      assert.match(tooBig.body.message, /5 MB/);

      assert.equal(fake.saved.length, 0, 'nothing reaches storage for rejected uploads');
    });

    it('only lets approved agencies upload photos', async () => {
      fake = fakeImageStorage();
      const res = await upload(draftVendor.token, '/api/v1/agencies/me/header-image', h.PNG, 'a.png', 'image/png');
      assert.equal(res.status, 403);
      const asCustomer = await upload(customer.token, '/api/v1/agencies/me/header-image', h.PNG, 'a.png', 'image/png');
      assert.equal(asCustomer.status, 403);
    });

    it('sets, replaces and removes the header photo under the agency folder', async () => {
      fake = fakeImageStorage();
      const url = '/api/v1/agencies/me/header-image';
      const first = await upload(vendor.token, url, h.PNG, 'banner.png', 'image/png');
      assert.equal(first.status, 200);
      assert.match(first.body.data.headerImage.url, /^https:\/\/res\.cloudinary\.com\//);
      assert.equal(fake.saved[0], `umrahconnect/agencies/${vendor.agency._id}/header/img1`);

      const second = await upload(vendor.token, url, WEBP, 'banner.webp', 'image/webp');
      assert.equal(second.status, 200);
      assert.deepEqual(fake.deleted, [fake.saved[0]], 'the replaced photo is deleted');

      const me = await h.api().get('/api/v1/agencies/me').set(auth(vendor.token));
      assert.deepEqual(me.body.data.agency.headerImage, { url: second.body.data.headerImage.url });

      const removed = await h.api().delete(url).set(auth(vendor.token));
      assert.equal(removed.status, 200);
      assert.deepEqual(fake.deleted, fake.saved);
      assert.equal((await Agency.findById(vendor.agency._id)).headerImage, undefined);

      await upload(vendor.token, url, h.PNG, 'banner.png', 'image/png'); // keep one for the public page test
    });

    it('sets a package cover photo shown in the public catalogue', async () => {
      fake = fakeImageStorage();
      const url = `/api/v1/agencies/packages/${packageId}/cover-image`;
      const other = await upload(otherVendor.token, url, h.PNG, 'c.png', 'image/png');
      assert.equal(other.status, 404);

      const res = await upload(vendor.token, url, h.PNG, 'cover.png', 'image/png');
      assert.equal(res.status, 200);
      assert.equal(fake.saved.at(-1), `umrahconnect/agencies/${vendor.agency._id}/packages/img${fake.saved.length}`);

      // Editing the package keeps its cover photo.
      await h.api().put(`/api/v1/agencies/packages/${packageId}`).set(auth(vendor.token)).send(PACKAGE());

      const pub = await h.api().get(`/api/v1/packages/${packageId}`);
      assert.deepEqual(pub.body.data.coverImage, { url: res.body.data.coverImage.url });
      const list = await h.api().get('/api/v1/packages');
      assert.equal(list.body.data[0].coverImage.url, res.body.data.coverImage.url);
      assert.equal(JSON.stringify(list.body).includes('publicId'), false);
    });

    it('deletes the cover photo along with its package', async () => {
      fake = fakeImageStorage();
      const extra = await h.api().post('/api/v1/agencies/packages').set(auth(vendor.token)).send(PACKAGE());
      const id = extra.body.data._id;
      await upload(vendor.token, `/api/v1/agencies/packages/${id}/cover-image`, h.PNG, 'c.png', 'image/png');
      const del = await h.api().delete(`/api/v1/agencies/packages/${id}`).set(auth(vendor.token));
      assert.equal(del.status, 200);
      assert.deepEqual(fake.deleted, fake.saved);
    });
  });

  describe('reviews', () => {
    const review = (token, id, body) => h.api().put(`/api/v1/quotations/${id}/review`).set(auth(token)).send(body);

    before(async () => {
      const q = await h
        .api()
        .post(`/api/v1/packages/${packageId}/quotations`)
        .set(auth(customer.token))
        .send({ seats: 2 });
      quotationId = q.body.data._id;
    });

    it('refuses reviews before the booking is confirmed and the trip has ended', async () => {
      const pending = await review(customer.token, quotationId, { rating: 5 });
      assert.equal(pending.status, 403);
      assert.equal(pending.body.code, 'REVIEW_NOT_ALLOWED');

      await h.api().patch(`/api/v1/agencies/quotations/${quotationId}/confirm`).set(auth(vendor.token)).send({});
      const upcoming = await review(customer.token, quotationId, { rating: 5 });
      assert.equal(upcoming.status, 403);
      assert.equal(upcoming.body.code, 'TRIP_NOT_COMPLETED');

      const mine = await h.api().get('/api/v1/quotations').set(auth(customer.token));
      assert.equal(mine.body.data[0].canReview, false);
    });

    it('lets the customer review a completed trip once, and edit it', async () => {
      // The trip happened: move it into the past.
      await Package.updateOne(
        { _id: packageId },
        { $set: { departureDate: new Date(Date.now() - 15 * DAY), returnDate: new Date(Date.now() - 5 * DAY) } },
      );
      const mine = await h.api().get('/api/v1/quotations').set(auth(customer.token));
      assert.equal(mine.body.data[0].canReview, true);
      assert.equal(mine.body.data[0].review, null);

      const invalid = await review(customer.token, quotationId, { rating: 6 });
      assert.equal(invalid.status, 400);

      const created = await review(customer.token, quotationId, { rating: 4, comment: 'Good hotels, smooth visa.' });
      assert.equal(created.status, 201);

      const updated = await review(customer.token, quotationId, { rating: 5, comment: 'Excellent service throughout.' });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.data._id, created.body.data._id, 'one review per booking');

      const after = await h.api().get('/api/v1/quotations').set(auth(customer.token));
      assert.equal(after.body.data[0].review.rating, 5);
    });

    it("never lets anyone review someone else's booking", async () => {
      const res = await review(stranger.token, quotationId, { rating: 1 });
      assert.equal(res.status, 404);
      const asAgency = await review(vendor.token, quotationId, { rating: 5 });
      assert.equal(asAgency.status, 403);
    });
  });

  describe('public agency page', () => {
    it('shows the profile, header photo and rating summary without contact details', async () => {
      const res = await h.api().get(`/api/v1/vendors/${vendor.agency._id}`);
      assert.equal(res.status, 200);
      const profile = res.body.data;
      assert.equal(profile.businessName, 'Al-Huda Travels');
      assert.equal(profile.description, 'Family-run Umrah specialists since 2005.');
      assert.match(profile.headerImage.url, /^https:\/\//);
      assert.deepEqual(profile.rating, { average: 5, count: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } });
      assert.equal(profile.packageCount, 0, 'the departed package is no longer listed');
      for (const secret of ['contact@vendor.example.com', '+923001112233', '12 Mall Road', 'publicId', 'userId']) {
        assert.equal(JSON.stringify(profile).includes(secret), false, `${secret} must not be public`);
      }
    });

    it('lists reviews with a shortened reviewer name', async () => {
      const res = await h.api().get(`/api/v1/vendors/${vendor.agency._id}/reviews`);
      assert.equal(res.status, 200);
      assert.equal(res.body.meta.total, 1);
      const [r] = res.body.data;
      assert.equal(r.reviewerName, 'Ahmed K.');
      assert.equal(r.rating, 5);
      assert.equal(r.packageTitle, '10 Days Family Umrah');
      assert.equal(JSON.stringify(r).includes(customer.payload.email), false);
    });

    it('has no page for agencies that are not approved', async () => {
      const draft = await Agency.findOne({ userId: draftVendor.session.user.id });
      assert.equal((await h.api().get(`/api/v1/vendors/${draft._id}`)).status, 404);
      assert.equal((await h.api().get(`/api/v1/vendors/${draft._id}/reviews`)).status, 404);
      assert.equal((await h.api().get('/api/v1/vendors/not-an-id')).status, 400);
    });
  });
});
