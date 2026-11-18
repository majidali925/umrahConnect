const nodemailer = require('nodemailer');
const env = require('../config/env');
const templates = require('../templates/emails');

let transporter = null;
if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
}

// In tests, delivered messages are captured here so suites can read OTP codes.
const outbox = [];

async function sendEmail(to, templateName, data) {
  const { subject, html, text } = templates[templateName](data);

  if (env.isTest) {
    outbox.push({ channel: 'email', to, templateName, subject, text, data });
    return;
  }

  if (!transporter) {
    // Development fallback: no SMTP configured, so print the message to the console.
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
    return;
  }

  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
  } catch (err) {
    // Email failures must not break the user-facing request; they are logged for follow-up.
    console.error(`[email] Failed to send "${subject}" to ${to}: ${err.message}`);
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

module.exports = { sendEmail, sendSms, notify, outbox };
