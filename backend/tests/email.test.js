const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const env = require('../src/config/env');
const notification = require('../src/services/notification.service');
const ApiError = require('../src/utils/ApiError');
const { OTP, User } = require('../src/models');

describe('Email delivery', () => {
  before(h.setupDatabase);
  after(h.teardownDatabase);

  describe('Brevo API request', () => {
    const originalFetch = global.fetch;
    const originalBrevo = { ...env.brevo };
    let calls;

    before(() => {
      Object.assign(env.brevo, { apiKey: 'test-brevo-key', fromEmail: 'codes@example.com', fromName: 'UmrahConnect' });
    });
    after(() => {
      Object.assign(env.brevo, originalBrevo);
      global.fetch = originalFetch;
    });

    const mockFetch = (status, body) => {
      calls = [];
      global.fetch = async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
      };
    };

    it('posts the email to Brevo with the API key and configured sender', async () => {
      mockFetch(201, { messageId: '<abc@brevo>' });
      await notification.sendViaBrevo({ to: 'pilgrim@example.com', subject: 'Your code', html: '<b>123456</b>', text: '123456' });

      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
      assert.equal(calls[0].options.method, 'POST');
      assert.equal(calls[0].options.headers['api-key'], 'test-brevo-key');
      assert.deepEqual(JSON.parse(calls[0].options.body), {
        sender: { name: 'UmrahConnect', email: 'codes@example.com' },
        to: [{ email: 'pilgrim@example.com' }],
        subject: 'Your code',
        htmlContent: '<b>123456</b>',
        textContent: '123456',
      });
    });

    it("throws with Brevo's error message when the email is rejected", async () => {
      mockFetch(400, { code: 'invalid_parameter', message: 'sender is not valid' });
      await assert.rejects(
        notification.sendViaBrevo({ to: 'pilgrim@example.com', subject: 'Your code', html: 'x', text: 'x' }),
        /Brevo responded 400: sender is not valid/,
      );
    });
  });

  describe('when a verification code email cannot be sent', () => {
    const originalSendEmail = notification.sendEmail;
    const user = h.uniqueUser();

    const failCodeEmails = () => {
      notification.sendEmail = async (to, template, data, options) => {
        if (options?.required) {
          throw new ApiError(502, "We couldn't send the email.", { code: 'EMAIL_NOT_SENT' });
        }
        return originalSendEmail(to, template, data, options);
      };
    };
    afterEach(() => {
      notification.sendEmail = originalSendEmail;
    });

    it('still creates the account on sign-up and reports the code as not sent', async () => {
      failCodeEmails();
      const res = await h.api().post('/api/v1/auth/register').send(user);
      assert.equal(res.status, 201);
      assert.equal(res.body.data.verification.sent, false);
      assert.equal(res.body.data.verification.channel, 'email');

      const account = await User.findOne({ email: user.email });
      assert.ok(account);
      assert.equal(await OTP.countDocuments({ userId: account._id }), 0, 'unsent code is not kept');
    });

    it('returns an error on resend and keeps no unsent code', async () => {
      failCodeEmails();
      const res = await h.api().post('/api/v1/auth/resend-otp').send({ identifier: user.email });
      assert.equal(res.status, 502);
      assert.equal(res.body.code, 'EMAIL_NOT_SENT');
      const account = await User.findOne({ email: user.email });
      assert.equal(await OTP.countDocuments({ userId: account._id }), 0);
    });

    it('lets the user resend right away once email works again (no cooldown)', async () => {
      const res = await h.api().post('/api/v1/auth/resend-otp').send({ identifier: user.email });
      assert.equal(res.status, 200);
      assert.match(h.latestOtp(user.email), /^\d{6}$/);
    });
  });
});
