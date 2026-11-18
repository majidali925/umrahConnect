const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

describe('Authentication', () => {
  before(h.setupDatabase);
  after(h.teardownDatabase);

  describe('registration validation', () => {
    it('rejects invalid input with field errors', async () => {
      const res = await h
        .api()
        .post('/api/v1/auth/register')
        .send({ ...h.uniqueUser(), phone: '12345', confirmPassword: 'nope', password: 'short' });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
      const fields = res.body.errors.map((e) => e.field);
      assert.ok(fields.includes('phone'));
      assert.ok(fields.includes('password'));
      assert.ok(fields.includes('confirmPassword'));
    });

    it('does not allow SUPER_ADMIN self-registration', async () => {
      const res = await h.api().post('/api/v1/auth/register').send(h.uniqueUser({ role: 'SUPER_ADMIN' }));
      assert.equal(res.status, 400);
    });

    it('requires vendorType for vendors and forbids it for customers', async () => {
      const vendor = await h.api().post('/api/v1/auth/register').send(h.uniqueUser({ role: 'AGENCY' }));
      assert.equal(vendor.status, 400);
      const customer = await h
        .api()
        .post('/api/v1/auth/register')
        .send(h.uniqueUser({ vendorType: 'REGISTERED_AGENCY' }));
      assert.equal(customer.status, 400);
    });
  });

  describe('customer journey', () => {
    const user = h.uniqueUser({ phone: '+92 300 7654321' });
    let cookie;
    let token;

    it('registers and sends an email OTP without leaking secrets', async () => {
      const res = await h.api().post('/api/v1/auth/register').send(user);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.phone, '+923007654321');
      assert.equal(res.body.data.user.password, undefined);
      assert.equal(res.body.data.verification.channel, 'email');
      assert.match(h.latestOtp(user.email), /^\d{6}$/);
    });

    it('rejects duplicate email and phone', async () => {
      const res = await h.api().post('/api/v1/auth/register').send({ ...user });
      assert.equal(res.status, 409);
      assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['email', 'phone']);
    });

    it('blocks login until the account is verified', async () => {
      const res = await h
        .api()
        .post('/api/v1/auth/login')
        .send({ identifier: user.email, password: user.password });
      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'ACCOUNT_NOT_VERIFIED');
    });

    it('enforces the OTP resend cooldown', async () => {
      const res = await h.api().post('/api/v1/auth/resend-otp').send({ identifier: user.email });
      assert.equal(res.status, 429);
      assert.equal(res.body.code, 'OTP_COOLDOWN');
    });

    it('rejects a wrong OTP and counts attempts', async () => {
      const otp = h.latestOtp(user.email);
      const wrong = otp === '000000' ? '111111' : '000000';
      const res = await h.api().post('/api/v1/auth/verify-otp').send({ identifier: user.email, otp: wrong });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_OTP');
      assert.match(res.body.message, /4 attempts remaining/);
    });

    it('verifies the OTP and signs the user in with an HTTP-only refresh cookie', async () => {
      const res = await h
        .api()
        .post('/api/v1/auth/verify-otp')
        .send({ identifier: user.email, otp: h.latestOtp(user.email) });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.accessToken);
      assert.equal(res.body.data.refreshToken, undefined, 'refresh token must not be in the body');
      assert.equal(res.body.data.user.isEmailVerified, true);
      const raw = res.headers['set-cookie'].find((c) => c.startsWith('uc_refresh='));
      assert.match(raw, /HttpOnly/);
      assert.match(raw, /Path=\/api\/v1\/auth/);
      cookie = h.refreshCookie(res);
    });

    it('logs in with mobile number in any Pakistani format', async () => {
      const res = await h.api().post('/api/v1/auth/login').send({ identifier: '03007654321', password: user.password });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.role, 'CUSTOMER');
      token = res.body.data.accessToken;
      cookie = h.refreshCookie(res);
    });

    it('returns a generic error for wrong credentials', async () => {
      const wrongPassword = await h
        .api()
        .post('/api/v1/auth/login')
        .send({ identifier: user.email, password: 'WrongPass123' });
      const unknownUser = await h
        .api()
        .post('/api/v1/auth/login')
        .send({ identifier: 'nobody@example.com', password: 'WrongPass123' });
      assert.equal(wrongPassword.status, 401);
      assert.equal(unknownUser.status, 401);
      assert.equal(wrongPassword.body.message, unknownUser.body.message);
    });

    it('returns the current user from /me', async () => {
      const res = await h.api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.email, user.email);
    });

    it('rejects missing or invalid access tokens', async () => {
      assert.equal((await h.api().get('/api/v1/auth/me')).status, 401);
      const bad = await h.api().get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-token');
      assert.equal(bad.status, 401);
      assert.equal(bad.body.code, 'INVALID_TOKEN');
    });

    it('denies customers access to vendor and admin APIs', async () => {
      const agency = await h.api().get('/api/v1/agencies/me').set('Authorization', `Bearer ${token}`);
      const admin = await h.api().get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
      assert.equal(agency.status, 403);
      // Admin APIs only accept admin-signed tokens, so a user token is not even recognised.
      assert.equal(admin.status, 401);
      assert.equal(admin.body.code, 'INVALID_TOKEN');
    });

    it('rotates refresh tokens and detects reuse of an old token', async () => {
      const first = cookie;
      const r1 = await h.api().post('/api/v1/auth/refresh').set('Cookie', first);
      assert.equal(r1.status, 200);
      assert.ok(r1.body.data.accessToken);
      const second = h.refreshCookie(r1);
      assert.notEqual(second, first);

      const r2 = await h.api().post('/api/v1/auth/refresh').set('Cookie', second);
      assert.equal(r2.status, 200);
      const third = h.refreshCookie(r2);

      // `first` is now two rotations old: replaying it revokes the whole session.
      const replay = await h.api().post('/api/v1/auth/refresh').set('Cookie', first);
      assert.equal(replay.status, 401);
      assert.equal(replay.body.code, 'REFRESH_TOKEN_REUSED');
      const afterRevoke = await h.api().post('/api/v1/auth/refresh').set('Cookie', third);
      assert.equal(afterRevoke.status, 401);
    });

    it('tolerates concurrent refreshes within the grace window', async () => {
      const login = await h.api().post('/api/v1/auth/login').send({ identifier: user.email, password: user.password });
      const c = h.refreshCookie(login);
      const [a, b] = await Promise.all([
        h.api().post('/api/v1/auth/refresh').set('Cookie', c),
        h.api().post('/api/v1/auth/refresh').set('Cookie', c),
      ]);
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      cookie = h.refreshCookie(a) || h.refreshCookie(b);
    });

    it('logs out and invalidates the refresh token', async () => {
      const res = await h.api().post('/api/v1/auth/logout').set('Cookie', cookie);
      assert.equal(res.status, 200);
      assert.match(res.headers['set-cookie'][0], /uc_refresh=;/);
      const after = await h.api().post('/api/v1/auth/refresh').set('Cookie', cookie);
      assert.equal(after.status, 401);
    });

    it('resets the password with an emailed code', async () => {
      const unknown = await h.api().post('/api/v1/auth/forgot-password').send({ identifier: 'ghost@example.com' });
      const known = await h.api().post('/api/v1/auth/forgot-password').send({ identifier: user.email });
      assert.equal(unknown.status, 200);
      assert.equal(known.status, 200);
      assert.equal(unknown.body.message, known.body.message, 'must not reveal account existence');

      const reset = await h.api().post('/api/v1/auth/reset-password').send({
        identifier: user.email,
        otp: h.latestOtp(user.email),
        password: 'NewPassw0rd456',
        confirmPassword: 'NewPassw0rd456',
      });
      assert.equal(reset.status, 200);

      const oldLogin = await h.api().post('/api/v1/auth/login').send({ identifier: user.email, password: user.password });
      assert.equal(oldLogin.status, 401);
      const newLogin = await h
        .api()
        .post('/api/v1/auth/login')
        .send({ identifier: user.email, password: 'NewPassw0rd456' });
      assert.equal(newLogin.status, 200);
    });

    it('answers reset-password the same way for unknown accounts and accounts without a code', async () => {
      const body = (identifier) => ({ identifier, otp: '123456', password: 'Another0ne123', confirmPassword: 'Another0ne123' });
      const unknown = await h.api().post('/api/v1/auth/reset-password').send(body('ghost@example.com'));
      const known = await h.api().post('/api/v1/auth/reset-password').send(body(user.email));
      assert.equal(unknown.status, 400);
      assert.equal(known.status, 400);
      assert.equal(unknown.body.code, known.body.code);
      assert.equal(unknown.body.message, known.body.message, 'must not reveal account existence');
    });

    it('supports phone verification via SMS OTP', async () => {
      const resend = await h
        .api()
        .post('/api/v1/auth/resend-otp')
        .send({ identifier: user.email, purpose: 'PHONE_VERIFICATION' });
      assert.equal(resend.status, 200);
      assert.equal(resend.body.data.channel, 'sms');
      const verify = await h.api().post('/api/v1/auth/verify-otp').send({
        identifier: user.email,
        purpose: 'PHONE_VERIFICATION',
        otp: h.latestOtp('+923007654321'),
      });
      assert.equal(verify.status, 200);
      assert.equal(verify.body.data.user.isPhoneVerified, true);
    });
  });
});
