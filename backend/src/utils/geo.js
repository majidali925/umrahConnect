/**
 * Small geometry helpers for distances of a few kilometres around the Harams. Points are
 * [lat, lng] pairs. Over such short distances a local flat projection is accurate to well
 * under a metre, which keeps the maths simple.
 */

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Projects `point` to metres (x east, y north) relative to `origin`. */
function project([lat, lng], [originLat, originLng]) {
  return {
    x: toRad(lng - originLng) * Math.cos(toRad(originLat)) * EARTH_RADIUS_M,
    y: toRad(lat - originLat) * EARTH_RADIUS_M,
  };
}

/** Distance from the origin (0, 0) to the segment a–b, all in projected metres. */
function distanceToSegment(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / lengthSq)) : 0;
  return Math.hypot(a.x + t * dx, a.y + t * dy);
}

/** Ray-casting point-in-polygon test for the origin against a projected ring. */
function containsOrigin(ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > 0 !== b.y > 0 && 0 < ((b.x - a.x) * -a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * Straight-line distance in metres from `point` to the nearest edge of a footprint made of
 * one or more closed rings. Returns 0 when the point lies inside the footprint.
 */
function distanceToFootprint(point, rings) {
  let best = Infinity;
  for (const ring of rings) {
    const projected = ring.map((p) => project(p, point));
    if (containsOrigin(projected)) return 0;
    for (let i = 0; i < projected.length; i += 1) {
      const next = projected[(i + 1) % projected.length];
      best = Math.min(best, distanceToSegment(projected[i], next));
    }
  }
  return best;
}

module.exports = { distanceToFootprint };
