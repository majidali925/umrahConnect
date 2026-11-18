const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('Admin authentication (separate from marketplace users)', () => {
  let admin;
  let customer;

  before(async () => {
    await h.setupDatabase();
    admin = await h.createAdmin();
    customer = await h.registerVerified();
  });
  after(h.teardownDatabase);

  it('signs in through /admin/auth with its own cookie scoped to /api/v1/admin/auth', async () => {
    const res = await h.api().post('/api/v1/admin/auth/login').send(h.ADMIN_CREDENTIALS);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.admin.email, h.ADMIN_CREDENTIALS.email);
    assert.equal(res.body.data.admin.role, 'SUPER_ADMIN');
    assert.equal(res.body.data.refreshToken, undefined);
    const raw = res.headers['set-cookie'].find((c) => c.startsWith('uc_admin_refresh='));
    assert.match(raw, /Path=\/api\/v1\/admin\/auth/);
    assert.match(raw, /HttpOnly/);
    assert.equal(h.refreshCookie(res), undefined, 'must not set the marketplace refresh cookie');
  });

  it('returns a generic error for wrong admin credentials', async () => {
    const wrong = await h
      .api()
      .post('/api/v1/admin/auth/login')
      .send({ email: h.ADMIN_CREDENTIALS.email, password: 'nope-nope-1' });
    const unknown = await h
      .api()
      .post('/api/v1/admin/auth/login')
      .send({ email: 'ghost@example.com', password: 'nope-nope-1' });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  it('cannot sign in to the marketplace login with admin credentials', async () => {
    const res = await h
      .api()
      .post('/api/v1/auth/login')
      .send({ identifier: h.ADMIN_CREDENTIALS.email, password: h.ADMIN_CREDENTIALS.password });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  it('marketplace users cannot sign in to the admin login', async () => {
    const res = await h
      .api()
      .post('/api/v1/admin/auth/login')
      .send({ email: customer.payload.email, password: customer.payload.password });
    assert.equal(res.status, 401);
  });

  it('keeps tokens from crossing between the two systems', async () => {
    const userTokenOnAdmin = await h.api().get('/api/v1/admin/dashboard').set(bearer(customer.token));
    assert.equal(userTokenOnAdmin.status, 401);
    assert.equal(userTokenOnAdmin.body.code, 'INVALID_TOKEN');

    const adminTokenOnUser = await h.api().get('/api/v1/auth/me').set(bearer(admin.token));
    assert.equal(adminTokenOnUser.status, 401);
    assert.equal(adminTokenOnUser.body.code, 'INVALID_TOKEN');

    // An admin refresh cookie sent to the user refresh endpoint is ignored (different name),
    // and a user cookie value renamed to the admin cookie fails the admin signature check.
    const crossed = await h.api().post('/api/v1/auth/refresh').set('Cookie', admin.cookie);
    assert.equal(crossed.status, 401);
    const forged = customer.cookie.replace('uc_refresh=', 'uc_admin_refresh=');
    const forgedRes = await h.api().post('/api/v1/admin/auth/refresh').set('Cookie', forged);
    assert.equal(forgedRes.status, 401);
    assert.equal(forgedRes.body.code, 'INVALID_REFRESH_TOKEN');
  });

  it('returns the current admin from /admin/auth/me', async () => {
    const res = await h.api().get('/api/v1/admin/auth/me').set(bearer(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.admin.email, h.ADMIN_CREDENTIALS.email);
    assert.equal((await h.api().get('/api/v1/admin/auth/me')).status, 401);
  });

  it('rotates admin refresh tokens and revokes the session on reuse', async () => {
    const login = await h.api().post('/api/v1/admin/auth/login').send(h.ADMIN_CREDENTIALS);
    const first = h.adminRefreshCookie(login);
    const r1 = await h.api().post('/api/v1/admin/auth/refresh').set('Cookie', first);
    assert.equal(r1.status, 200);
    assert.ok(r1.body.data.accessToken);
    const second = h.adminRefreshCookie(r1);
    const r2 = await h.api().post('/api/v1/admin/auth/refresh').set('Cookie', second);
    const third = h.adminRefreshCookie(r2);

    const replay = await h.api().post('/api/v1/admin/auth/refresh').set('Cookie', first);
    assert.equal(replay.status, 401);
    assert.equal(replay.body.code, 'REFRESH_TOKEN_REUSED');
    assert.equal((await h.api().post('/api/v1/admin/auth/refresh').set('Cookie', third)).status, 401);
  });

  it('logs out and clears the admin cookie', async () => {
    const login = await h.api().post('/api/v1/admin/auth/login').send(h.ADMIN_CREDENTIALS);
    const cookie = h.adminRefreshCookie(login);
    const out = await h.api().post('/api/v1/admin/auth/logout').set('Cookie', cookie);
    assert.equal(out.status, 200);
    assert.equal((await h.api().post('/api/v1/admin/auth/refresh').set('Cookie', cookie)).status, 401);
  });

  it('audits admin sign-ins and does not list admins among marketplace users', async () => {
    const logs = await h.api().get('/api/v1/admin/audit-logs?action=ADMIN_LOGGED_IN').set(bearer(admin.token));
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data.length >= 1);
    assert.equal(logs.body.data[0].performedBy.email, h.ADMIN_CREDENTIALS.email);

    const users = await h.api().get('/api/v1/admin/users?limit=100').set(bearer(admin.token));
    assert.ok(users.body.data.every((u) => u.email !== h.ADMIN_CREDENTIALS.email));
    const badRole = await h.api().get('/api/v1/admin/users?role=SUPER_ADMIN').set(bearer(admin.token));
    assert.equal(badRole.status, 400);

    const dash = await h.api().get('/api/v1/admin/dashboard').set(bearer(admin.token));
    assert.equal(dash.body.data.admins.total, 1);
    assert.equal(dash.body.data.users.byRole.SUPER_ADMIN, undefined);
  });

  it('applies separate CORS allow-lists to the admin and marketplace APIs', async () => {
    const adminOrigin = 'http://localhost:8090';
    const siteOrigin = 'http://localhost:8080';
    const adminFromAdmin = await h.api().options('/api/v1/admin/auth/login').set('Origin', adminOrigin);
    const adminFromSite = await h.api().options('/api/v1/admin/auth/login').set('Origin', siteOrigin);
    const siteFromSite = await h.api().options('/api/v1/auth/login').set('Origin', siteOrigin);
    const siteFromAdmin = await h.api().options('/api/v1/auth/login').set('Origin', adminOrigin);
    assert.equal(adminFromAdmin.headers['access-control-allow-origin'], adminOrigin);
    assert.equal(adminFromSite.headers['access-control-allow-origin'], undefined);
    assert.equal(siteFromSite.headers['access-control-allow-origin'], siteOrigin);
    assert.equal(siteFromAdmin.headers['access-control-allow-origin'], undefined);
  });
});
