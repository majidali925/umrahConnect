const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { Agency } = require('../src/models');
const { distanceToFootprint } = require('../src/utils/geo');
const { HARAMS } = require('../src/constants/holySites');
const { resetHotelLookup } = require('../src/services/hotelLookup.service');

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const search = (token, query) => h.api().get('/api/v1/agencies/hotels/search').query(query).set(auth(token));

// Trimmed Nominatim /search answer: two hotels plus a shop that must be filtered out.
const NOMINATIM_MADINAH = [
  {
    category: 'tourism',
    type: 'hotel',
    name: 'Dar Al-Taqwa Hotel',
    display_name: 'Dar Al-Taqwa Hotel, 2981, King Fahd Road, Badaah, Medina, Saudi Arabia',
    lat: '24.4712004',
    lon: '39.6118525',
  },
  {
    category: 'shop',
    type: 'jewelry',
    name: 'Anwar Al Medinah',
    display_name: 'Anwar Al Medinah, Medina, Saudi Arabia',
    lat: '24.4719593',
    lon: '39.6125227',
  },
  {
    category: 'tourism',
    type: 'hotel',
    name: 'ZamZam Pullman Madinah',
    display_name: 'ZamZam Pullman Madinah, Sayyedah Al-Aisha Road, Bani Khidrah, Medina, Saudi Arabia',
    lat: '24.4644758',
    lon: '39.6117903',
  },
];

describe('Distance from the Haram', () => {
  it('is zero inside the footprint', () => {
    assert.equal(distanceToFootprint([21.422487, 39.826206], HARAMS.MAKKAH.rings), 0); // the Kaaba
    assert.equal(distanceToFootprint([24.4665, 39.6112], HARAMS.MADINAH.rings), 0); // Nabawi courtyard
  });

  it('measures to the nearest edge, not the centre', () => {
    const near = distanceToFootprint([24.4712004, 39.6118525], HARAMS.MADINAH.rings); // facing the north gates
    assert.ok(near > 0 && near < 60, `expected under 60 m, got ${near}`);
    const far = distanceToFootprint([21.4224764, 39.8489595], HARAMS.MAKKAH.rings); // Aziziyah, ~2.2 km out
    assert.ok(far > 2000 && far < 2400, `expected about 2.2 km, got ${far}`);
  });
});

describe('Hotel search for packages', () => {
  let vendor;
  let draftVendor;
  let customer;
  let realFetch;
  let calls;
  let reply;

  before(async () => {
    await h.setupDatabase();
    vendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'REGISTERED_AGENCY' });
    await Agency.updateOne({ userId: vendor.session.user.id }, { $set: { verificationStatus: 'APPROVED', approvedAt: new Date() } });
    draftVendor = await h.registerVerified({ role: 'AGENCY', vendorType: 'INDEPENDENT_OPERATOR' });
    customer = await h.registerVerified();
    realFetch = global.fetch;
  });
  after(h.teardownDatabase);

  beforeEach(() => {
    resetHotelLookup();
    calls = [];
    reply = () => new Response(JSON.stringify(NOMINATIM_MADINAH), { status: 200 });
    global.fetch = async (url, init) => {
      calls.push({ url: new URL(url), init });
      return reply();
    };
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns lodging only, with distance from the Haram, searched near the right city', async () => {
    const res = await search(vendor.token, { city: 'MADINAH', q: 'dar al taqwa' });
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((x) => x.name),
      ['Dar Al-Taqwa Hotel', 'ZamZam Pullman Madinah'],
    );
    const [taqwa, pullman] = res.body.data;
    assert.equal(taqwa.address, '2981, King Fahd Road, Badaah');
    assert.equal(taqwa.distanceMeters % 10, 0);
    assert.ok(taqwa.distanceMeters < pullman.distanceMeters);

    assert.equal(calls.length, 1);
    const { url, init } = calls[0];
    assert.equal(url.searchParams.get('q'), 'dar al taqwa');
    assert.equal(url.searchParams.get('bounded'), '1');
    assert.equal(url.searchParams.get('viewbox'), HARAMS.MADINAH.searchBox.join(','));
    assert.ok(init.headers['User-Agent']);
  });

  it('caches repeated searches', async () => {
    await search(vendor.token, { city: 'MADINAH', q: 'Pullman' });
    const again = await search(vendor.token, { city: 'MADINAH', q: '  pullman ' });
    assert.equal(again.status, 200);
    assert.equal(calls.length, 1);
  });

  it('reports an outage as 503 so the owner can type the distance', async () => {
    reply = () => new Response('busy', { status: 502 });
    const res = await search(vendor.token, { city: 'MAKKAH', q: 'Hilton' });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'HOTEL_LOOKUP_UNAVAILABLE');
  });

  it('validates the query', async () => {
    assert.equal((await search(vendor.token, { city: 'JEDDAH', q: 'Hilton' })).status, 400);
    assert.equal((await search(vendor.token, { city: 'MAKKAH', q: 'ab' })).status, 400);
    assert.equal(calls.length, 0);
  });

  it('is only available to approved agencies', async () => {
    assert.equal((await search(customer.token, { city: 'MAKKAH', q: 'Hilton' })).status, 403);
    assert.equal((await search(draftVendor.token, { city: 'MAKKAH', q: 'Hilton' })).status, 403);
    assert.equal((await h.api().get('/api/v1/agencies/hotels/search').query({ city: 'MAKKAH', q: 'Hilton' })).status, 401);
    assert.equal(calls.length, 0);
  });
});
