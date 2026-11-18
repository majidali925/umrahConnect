const crypto = require('crypto');

/** Fast, deterministic hash for high-entropy secrets (refresh tokens). Not for passwords. */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateOtp(length = 6) {
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { sha256, generateOtp, safeEqual };
