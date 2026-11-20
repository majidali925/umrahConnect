const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { distanceToFootprint } = require('../utils/geo');
const { HARAMS } = require('../constants/holySites');

/**
 * Hotel search for the package form: finds hotels near the Haram of a holy city through
 * OpenStreetMap's Nominatim geocoder and reports each one's distance from the mosque.
 *
 * The public Nominatim server allows at most one request per second and asks clients to
 * cache results (https://operations.osmfoundation.org/policies/nominatim/), so requests are
 * spaced out across the whole process and answers are cached in memory.
 */

const MIN_INTERVAL_MS = env.isTest ? 0 : 1100;
const MAX_WAITING = 5;
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const MAX_RESULTS = 8;

// OpenStreetMap tags that mean "a place pilgrims can stay".
const LODGING_TYPES = new Set(['hotel', 'apartment', 'apartments', 'guest_house', 'hostel', 'motel']);

const cache = new Map();
let nextSlotAt = 0;
let waiting = 0;

const unavailable = () =>
  new ApiError(503, 'Hotel search is unavailable right now. Please enter the distance yourself.', {
    code: 'HOTEL_LOOKUP_UNAVAILABLE',
  });

/** Waits for this request's turn so the upstream service sees at most one request per interval. */
async function takeTurn() {
  if (waiting >= MAX_WAITING) throw unavailable();
  const now = Date.now();
  const at = Math.max(now, nextSlotAt);
  nextSlotAt = at + MIN_INTERVAL_MS;
  waiting += 1;
  try {
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  } finally {
    waiting -= 1;
  }
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // drop the oldest entry
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * GET with one retry when the connection fails before any answer arrives. After an idle spell
 * the pooled keep-alive connection is often already closed by the server, and the first
 * request on it fails with a network error even though the service is up. Timeouts are not
 * retried: the owner would wait twice as long for an answer that is not coming.
 */
async function fetchWithRetry(url, attempts = 2) {
  for (let attempt = 1; ; attempt += 1) {
    await takeTurn();
    try {
      return await fetch(url, {
        headers: { 'User-Agent': env.geocoder.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const reason = err.cause?.code || err.cause?.message || err.message;
      console.warn(`[hotel-lookup] geocoder request failed (attempt ${attempt}): ${err.name}: ${reason}`);
      if (err.name === 'TimeoutError' || attempt >= attempts) throw unavailable();
    }
  }
}

async function queryNominatim(haram, q) {
  const url = new URL('/search', env.geocoder.url);
  url.search = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '20', // over-fetch: shops and other non-lodging matches are filtered out below
    bounded: '1',
    viewbox: haram.searchBox.join(','),
    'accept-language': 'en',
  }).toString();

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    console.warn(`[hotel-lookup] geocoder responded ${res.status}`);
    throw unavailable();
  }
  const body = await res.json().catch(() => null);
  if (!Array.isArray(body)) throw unavailable();
  return body;
}

/**
 * Hotels matching `query` near the Haram of `city` (a HOLY_CITIES value), best match first:
 * [{ name, address, lat, lng, distanceMeters }]. distanceMeters is the straight-line distance
 * to the nearest edge of the mosque, rounded to 10 m.
 */
async function searchHotels(city, query) {
  const haram = HARAMS[city];
  const q = query.trim().replace(/\s+/g, ' ');
  const key = `${city}:${q.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const places = await queryNominatim(haram, q);
  const seen = new Set();
  const hotels = places
    .filter((p) => p.category === 'tourism' && LODGING_TYPES.has(p.type) && p.name)
    .map((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lon);
      return {
        name: p.name.slice(0, 150),
        // display_name repeats the name first; the rest is the address.
        address: p.display_name.split(', ').slice(1, 4).join(', '),
        lat,
        lng,
        distanceMeters: Math.round(distanceToFootprint([lat, lng], haram.rings) / 10) * 10,
      };
    })
    .filter((h) => {
      const k = h.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX_RESULTS);

  cacheSet(key, hotels);
  return hotels;
}

/** Test hook: forget cached answers and pacing state. */
function resetHotelLookup() {
  cache.clear();
  nextSlotAt = 0;
}

module.exports = { searchHotels, resetHotelLookup };
