const env = require('../config/env');

const BRAND_GREEN = '#0b5d3b';
const BRAND_GOLD = '#c9a227';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout(title, bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;background:#f5f7f6;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e3e9e5">
        <tr><td style="background:${BRAND_GREEN};padding:20px 28px;color:#fff;font-size:20px;font-weight:bold">
          Umrah<span style="color:${BRAND_GOLD}">Connect</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h2 style="margin:0 0 16px;font-size:20px;color:${BRAND_GREEN}">${escapeHtml(title)}</h2>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#fafbfa;color:#6b7a71;font-size:12px">
          This is an automated message from UmrahConnect. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const p = (text) => `<p style="margin:0 0 14px;line-height:1.6">${text}</p>`;
const codeBlock = (code) =>
  `<div style="font-size:30px;letter-spacing:8px;font-weight:bold;color:${BRAND_GREEN};background:#f0f6f2;border:1px dashed ${BRAND_GOLD};border-radius:8px;padding:14px;text-align:center;margin:8px 0 18px">${escapeHtml(code)}</div>`;
const button = (href, label) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND_GREEN};color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold">${escapeHtml(label)}</a>`;

const clientUrl = () => env.clientUrls[0];
const adminUrl = () => env.adminClientUrls[0];

const templates = {
  otp({ name, code, purpose, minutes }) {
    const isReset = purpose === 'PASSWORD_RESET';
    const title = isReset ? 'Reset your password' : 'Verify your account';
    const intro = isReset
      ? 'We received a request to reset your UmrahConnect password. Use the code below to continue.'
      : 'Welcome to UmrahConnect! Use the code below to verify your account.';
    return {
      subject: isReset ? 'Your UmrahConnect password reset code' : 'Your UmrahConnect verification code',
      text: `${intro}\n\nCode: ${code}\n\nThis code expires in ${minutes} minutes. If you did not request this, you can ignore this email.`,
      html: layout(
        title,
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(intro) +
          codeBlock(code) +
          p(`This code expires in <strong>${minutes} minutes</strong>. Never share it with anyone.`) +
          p('If you did not request this, you can safely ignore this email.'),
      ),
    };
  },

  passwordChanged({ name }) {
    return {
      subject: 'Your UmrahConnect password was changed',
      text: 'Your password was changed. If this was not you, contact support immediately.',
      html: layout(
        'Password changed',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p('Your UmrahConnect password was changed successfully and all active sessions were signed out.') +
          p('If you did not make this change, please contact our support team immediately.'),
      ),
    };
  },

  applicationSubmitted({ name, businessName }) {
    return {
      subject: 'We received your UmrahConnect vendor application',
      text: `Your application for ${businessName} has been submitted and is awaiting review.`,
      html: layout(
        'Application received',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`Thank you for applying to list <strong>${escapeHtml(businessName)}</strong> on UmrahConnect.`) +
          p('Our verification team will review your information and documents. You will receive an email once a decision is made.') +
          button(`${clientUrl()}/agency/pending-approval`, 'View application status'),
      ),
    };
  },

  adminNewApplication({ businessName, vendorTypeLabel, agencyId, isResubmission }) {
    return {
      subject: `${isResubmission ? 'Resubmitted' : 'New'} vendor application: ${businessName}`,
      text: `${businessName} (${vendorTypeLabel}) submitted an application for verification.`,
      html: layout(
        `${isResubmission ? 'Application resubmitted' : 'New vendor application'}`,
        p(`<strong>${escapeHtml(businessName)}</strong> (${escapeHtml(vendorTypeLabel)}) is awaiting verification.`) +
          button(`${adminUrl()}/agencies/${agencyId}`, 'Review application'),
      ),
    };
  },

  applicationApproved({ name, businessName }) {
    return {
      subject: 'Your UmrahConnect application has been approved',
      text: `Congratulations! ${businessName} has been approved on UmrahConnect.`,
      html: layout(
        'Application approved',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`Congratulations! <strong>${escapeHtml(businessName)}</strong> has been verified and approved on UmrahConnect.`) +
          button(`${clientUrl()}/agency/profile`, 'Go to your dashboard'),
      ),
    };
  },

  applicationRejected({ name, businessName, reason }) {
    return {
      subject: 'Action required on your UmrahConnect application',
      text: `Your application for ${businessName} was not approved. Reason: ${reason}. You can update and resubmit it.`,
      html: layout(
        'Application needs changes',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`Unfortunately we could not approve the application for <strong>${escapeHtml(businessName)}</strong> at this time.`) +
          p(`<strong>Reason:</strong> ${escapeHtml(reason)}`) +
          p('You can update your information or documents and resubmit your application.') +
          button(`${clientUrl()}/agency/rejected`, 'Update application'),
      ),
    };
  },

  agencySuspended({ name, businessName, reason }) {
    return {
      subject: 'Your UmrahConnect vendor account has been suspended',
      text: `${businessName} has been suspended. Reason: ${reason}`,
      html: layout(
        'Account suspended',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`Vendor access for <strong>${escapeHtml(businessName)}</strong> has been suspended.`) +
          p(`<strong>Reason:</strong> ${escapeHtml(reason)}`) +
          p('Please contact UmrahConnect support if you believe this is a mistake.'),
      ),
    };
  },

  agencyReinstated({ name, businessName }) {
    return {
      subject: 'Your UmrahConnect vendor account has been reinstated',
      text: `${businessName} has been reinstated.`,
      html: layout(
        'Account reinstated',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`Vendor access for <strong>${escapeHtml(businessName)}</strong> has been restored.`) +
          button(`${clientUrl()}/agency/profile`, 'Go to your dashboard'),
      ),
    };
  },

  quotationRequested({ businessName, packageTitle, customerName, seats }) {
    return {
      subject: `New seat request for ${packageTitle}`,
      text: `${customerName} requested ${seats} seat(s) on "${packageTitle}". Review it in your UmrahConnect dashboard.`,
      html: layout(
        'New seat request',
        p(`Assalam-o-Alaikum ${escapeHtml(businessName)},`) +
          p(
            `<strong>${escapeHtml(customerName)}</strong> has requested <strong>${escapeHtml(seats)}</strong> seat(s) on <strong>${escapeHtml(packageTitle)}</strong>.`,
          ) +
          p('Seats are reserved only when you confirm the request.') +
          button(`${clientUrl()}/agency/quotations`, 'Review request'),
      ),
    };
  },

  quotationConfirmed({ name, packageTitle, businessName, seats, note }) {
    return {
      subject: `Your booking for ${packageTitle} is confirmed`,
      text: `${businessName} confirmed ${seats} seat(s) on "${packageTitle}".${note ? ` Note: ${note}` : ''}`,
      html: layout(
        'Booking confirmed',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(
            `<strong>${escapeHtml(businessName)}</strong> has confirmed <strong>${escapeHtml(seats)}</strong> seat(s) on <strong>${escapeHtml(packageTitle)}</strong>.`,
          ) +
          (note ? p(`<strong>Note from the agency:</strong> ${escapeHtml(note)}`) : '') +
          p('The agency will contact you to arrange the next steps. Their contact details are in your account.') +
          button(`${clientUrl()}/account/quotations`, 'View my requests'),
      ),
    };
  },

  quotationDeclined({ name, packageTitle, businessName, reason }) {
    return {
      subject: `Update on your request for ${packageTitle}`,
      text: `${businessName} could not accept your request for "${packageTitle}". Reason: ${reason}`,
      html: layout(
        'Request not accepted',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`<strong>${escapeHtml(businessName)}</strong> could not accept your request for <strong>${escapeHtml(packageTitle)}</strong>.`) +
          p(`<strong>Reason:</strong> ${escapeHtml(reason)}`) +
          button(`${clientUrl()}/packages`, 'Browse other packages'),
      ),
    };
  },

  bookingCancelled({ name, packageTitle, businessName, reason }) {
    return {
      subject: `Your booking for ${packageTitle} was cancelled`,
      text: `${businessName} cancelled your booking for "${packageTitle}".${reason ? ` Reason: ${reason}` : ''}`,
      html: layout(
        'Booking cancelled',
        p(`Assalam-o-Alaikum ${escapeHtml(name)},`) +
          p(`<strong>${escapeHtml(businessName)}</strong> has cancelled your booking for <strong>${escapeHtml(packageTitle)}</strong>.`) +
          (reason ? p(`<strong>Reason:</strong> ${escapeHtml(reason)}`) : '') +
          p('Please contact the agency if you have any questions.') +
          button(`${clientUrl()}/account/quotations`, 'View my requests'),
      ),
    };
  },
};

module.exports = templates;
