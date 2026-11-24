// Test environment must be configured before any app module is loaded.
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/umrah_connect_test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-uploads-'));
// Tests never touch the real Cloudinary account: storage falls back to UPLOAD_DIR.
// (Set to empty, not deleted, so dotenv does not load the values from .env.)
for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
process.env.ADMIN_JWT_ACCESS_SECRET ||= 'test-admin-access-secret';
process.env.ADMIN_JWT_REFRESH_SECRET ||= 'test-admin-refresh-secret';

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { connectDatabase } = require('../src/config/database');
const { outbox } = require('../src/services/notification.service');
const { Admin } = require('../src/models');

const api = () => request(app);

async function setupDatabase() {
  await connectDatabase(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function teardownDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
}

/** Latest OTP code delivered to a recipient (captured by the notification service in tests). */
function latestOtp(to) {
  const msg = [...outbox].reverse().find((m) => m.to === to && m.data?.code);
  if (!msg) throw new Error(`No OTP found for ${to}`);
  return msg.data.code;
}

function refreshCookie(res, name = 'uc_refresh') {
  const cookies = res.headers['set-cookie'] || [];
  return cookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0];
}

const adminRefreshCookie = (res) => refreshCookie(res, 'uc_admin_refresh');

let counter = 0;
function uniqueUser(overrides = {}) {
  counter += 1;
  const n = String(counter).padStart(4, '0');
  return {
    fullName: `Test User ${n}`,
    email: `user${n}_${Date.now()}@example.com`,
    phone: `0300${String(1000000 + counter * 17).slice(-7)}`,
    password: 'Passw0rd123',
    confirmPassword: 'Passw0rd123',
    role: 'CUSTOMER',
    ...overrides,
  };
}

/** Registers and verifies a user, returning the signed-in session. */
async function registerVerified(overrides = {}) {
  const payload = uniqueUser(overrides);
  const reg = await api().post('/api/v1/auth/register').send(payload);
  if (reg.status !== 201) throw new Error(`Register failed: ${JSON.stringify(reg.body)}`);
  const res = await api()
    .post('/api/v1/auth/verify-otp')
    .send({ identifier: payload.email, otp: latestOtp(payload.email) });
  if (res.status !== 200) throw new Error(`Verify failed: ${JSON.stringify(res.body)}`);
  return { payload, token: res.body.data.accessToken, cookie: refreshCookie(res), session: res.body.data };
}

const ADMIN_CREDENTIALS = { email: 'admin@example.com', password: 'AdminPassw0rd!' };

/** Creates an admin in the separate `admins` collection and signs in through /admin/auth. */
async function createAdmin() {
  const admin = await Admin.create({ fullName: 'Admin', role: 'SUPER_ADMIN', ...ADMIN_CREDENTIALS });
  const res = await api().post('/api/v1/admin/auth/login').send(ADMIN_CREDENTIALS);
  if (res.status !== 200) throw new Error(`Admin login failed: ${JSON.stringify(res.body)}`);
  return { admin, token: res.body.data.accessToken, cookie: adminRefreshCookie(res) };
}

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

module.exports = {
  api,
  setupDatabase,
  teardownDatabase,
  latestOtp,
  refreshCookie,
  adminRefreshCookie,
  ADMIN_CREDENTIALS,
  uniqueUser,
  registerVerified,
  createAdmin,
  outbox,
  PDF,
  PNG,
};
