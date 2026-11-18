const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const SECRET_KEYS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_JWT_ACCESS_SECRET', 'ADMIN_JWT_REFRESH_SECRET'];
const required = ['MONGODB_URI', ...SECRET_KEYS];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
// Every signing secret must be unique, so a user token can never validate as an admin token.
if (new Set(SECRET_KEYS.map((key) => process.env[key])).size !== SECRET_KEYS.length) {
  throw new Error(`${SECRET_KEYS.join(', ')} must all be different`);
}

const parseOrigins = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  // Public marketplace frontend origin(s): allowed on every API route except /admin.
  clientUrls: parseOrigins(process.env.CLIENT_URL, 'http://localhost:8080'),
  // Admin panel origin(s): allowed on /admin routes only.
  adminClientUrls: parseOrigins(process.env.ADMIN_CLIENT_URL, 'http://localhost:8090'),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  adminJwt: {
    accessSecret: process.env.ADMIN_JWT_ACCESS_SECRET,
    refreshSecret: process.env.ADMIN_JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.ADMIN_REFRESH_TOKEN_EXPIRES_IN || '12h',
  },
  cookie: {
    // 'lax' works when frontend and backend share a site (e.g. localhost:8080 / localhost:5000).
    // Use 'none' (requires HTTPS) when they are deployed on different sites.
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : nodeEnv === 'production',
  },
  otp: {
    expiresInMinutes: Number(process.env.OTP_EXPIRES_IN_MINUTES) || 10,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'UmrahConnect <no-reply@umrahconnect.pk>',
  },
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || '',
  // OpenStreetMap Nominatim, used to look up hotels and their distance from the Haram.
  // The public server requires an identifying User-Agent; point GEOCODER_URL at a
  // self-hosted instance for heavy use.
  geocoder: {
    url: process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org',
    userAgent: process.env.GEOCODER_USER_AGENT || 'UmrahConnect/1.0 (hotel distance lookup)',
  },
  uploads: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')),
    maxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 5,
  },
};

module.exports = env;
