const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

function limiter({ windowMinutes, max, message, skip = () => false }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Rate limiting is disabled in automated tests so suites can run repeatedly.
    skip: (req) => env.isTest || skip(req),
    handler: (_req, res) =>
      res.status(429).json({ success: false, message, code: 'TOO_MANY_REQUESTS' }),
  });
}

const SENSITIVE_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 20;

// Session refresh and logout run on every page load, so they have their own budget (below).
// Counting them here let ordinary browsing lock everyone on a shared IP out of logging in.
const SESSION_PATHS = new Set(['/refresh', '/logout']);
const SESSION_COOKIES = ['uc_refresh', 'uc_admin_refresh'];

/** General limiter for the auth endpoints other than session refresh/logout. */
const authLimiter = limiter({
  windowMinutes: 15,
  max: SENSITIVE_MAX * 5,
  message: 'Too many requests. Please try again in a few minutes.',
  skip: (req) => SESSION_PATHS.has(req.path),
});

/**
 * Session refresh and logout. A request without a session cookie is answered with a cheap 401
 * (a logged-out visitor's page load), so it is not counted; signed-in clients get a generous budget.
 */
const sessionLimiter = limiter({
  windowMinutes: 15,
  max: SENSITIVE_MAX * 15,
  message: 'Too many requests. Please try again in a few minutes.',
  skip: (req) => !SESSION_COOKIES.some((name) => req.cookies?.[name]),
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

module.exports = { authLimiter, sessionLimiter, sensitiveAuthLimiter, adminLoginLimiter, quotationLimiter, hotelSearchLimiter };
