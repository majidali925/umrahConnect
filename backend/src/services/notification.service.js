const nodemailer = require('nodemailer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const templates = require('../templates/emails');

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_TIMEOUT_MS = 10000;

// SMTP is only used when Brevo is not configured.
let transporter = null;
if (!env.brevo.apiKey && env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
}

// In tests, delivered messages are captured here so suites can read OTP codes.
const outbox = [];

/** Sends one email through Brevo's transactional email API. Throws when Brevo rejects it. */
async function sendViaBrevo({ to, subject, html, text }) {
  const res = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: { 'api-key': env.brevo.apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: env.brevo.fromName, email: env.brevo.fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Brevo responded ${res.status}${body.message ? `: ${body.message}` : ''}`);
  }
}

/**
 * Sends a templated email through Brevo (or SMTP, or the console in development).
 * Failures are logged and swallowed so they never break the request, unless `required` is set
 * (verification codes): then the caller gets an error to show the user.
 */
async function sendEmail(to, templateName, data, { required = false } = {}) {
  const { subject, html, text } = templates[templateName](data);

  if (env.isTest) {
    outbox.push({ channel: 'email', to, templateName, subject, text, data });
    return;
  }

  if (!env.brevo.apiKey && !transporter) {
    // Development fallback: no email service configured, so print the message to the console.
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
    return;
  }

  try {
    if (env.brevo.apiKey) await sendViaBrevo({ to, subject, html, text });
    else await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}: ${err.message}`);
    if (required) {
      throw new ApiError(502, "We couldn't send the email. Please try again in a moment.", { code: 'EMAIL_NOT_SENT' });
    }
  }
}

/**
 * SMS delivery stub. No SMS gateway is integrated in Phase 1, so messages are logged.
 * Replace the body with a provider client (e.g. a local SMS aggregator) when available.
 */
async function sendSms(to, message, data = {}) {
  if (env.isTest) {
    outbox.push({ channel: 'sms', to, text: message, data });
    return;
  }
  console.log(`\n[sms:stub] To: ${to}\n${message}\n`);
}

/** Fire-and-forget wrapper for non-critical notifications. */
function notify(promise) {
  promise.catch((err) => console.error('[notify]', err.message));
}

module.exports = { sendEmail, sendViaBrevo, sendSms, notify, outbox };
