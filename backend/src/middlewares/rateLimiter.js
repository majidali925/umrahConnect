const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

function limiter({ windowMinutes, max, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Rate limiting is disabled in automated tests so suites can run repeatedly.
    skip: () => env.isTest,
    handler: (_req, res) =>
      res.status(429).json({ success: false, message, code: 'TOO_MANY_REQUESTS' }),
  });
}

const SENSITIVE_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 20;

/** General limiter for all auth endpoints (includes session refreshes on page loads). */
const authLimiter = limiter({
  windowMinutes: 15,
  max: SENSITIVE_MAX * 5,
  message: 'Too many requests. Please try again in a few minutes.',
});

/** Stricter limiter for credential and OTP endpoints that are brute-force targets. */
const sensitiveAuthLimiter = limiter({
  windowMinutes: 15,
  max: SENSITIVE_MAX,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

/** Admin sign-in is a high-value brute-force target: a tighter budget than user login. */
const adminLoginLimiter = limiter({
  windowMinutes: 15,
  max: Math.max(5, Math.floor(SENSITIVE_MAX / 2)),
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

/** Limits how many seat requests one client can send, to protect agencies from spam. */
const quotationLimiter = limiter({
  windowMinutes: 60,
  max: 20,
  message: 'You have sent many requests recently. Please try again later.',
});

/** Hotel search is typed into a form field; generous, but stops one client hogging the geocoder. */
const hotelSearchLimiter = limiter({
  windowMinutes: 1,
  max: 30,
  message: 'Too many hotel searches. Please wait a moment and try again.',
});

module.exports = { authLimiter, sensitiveAuthLimiter, adminLoginLimiter, quotationLimiter, hotelSearchLimiter };
