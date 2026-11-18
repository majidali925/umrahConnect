// Pakistani mobile numbers: 03XXXXXXXXX, 3XXXXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX, 00923XXXXXXXXX
const PK_MOBILE_REGEX = /^(?:\+92|0092|92|0)?(3\d{9})$/;
// Landlines / office numbers: area code + subscriber number, 9–11 digits after the prefix.
const PK_PHONE_REGEX = /^(?:\+92|0092|92|0)(\d{9,10})$/;

const clean = (value) => String(value || '').replace(/[\s-()]/g, '');

/** Normalizes a Pakistani mobile number to E.164 (+923XXXXXXXXX). Returns null if invalid. */
function normalizePakistaniMobile(value) {
  const match = clean(value).match(PK_MOBILE_REGEX);
  return match ? `+92${match[1]}` : null;
}

function normalizePakistaniPhone(value) {
  const mobile = normalizePakistaniMobile(value);
  if (mobile) return mobile;
  const match = clean(value).match(PK_PHONE_REGEX);
  return match ? `+92${match[1]}` : null;
}

function maskPhone(phone) {
  if (!phone) return phone;
  return `${phone.slice(0, 5)}*****${phone.slice(-2)}`;
}

function maskEmail(email) {
  if (!email) return email;
  const [name, domain] = email.split('@');
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(name.length - visible.length, 1))}@${domain}`;
}

module.exports = {
  normalizePakistaniMobile,
  normalizePakistaniPhone,
  maskPhone,
  maskEmail,
};
