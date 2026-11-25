const { User, Agency } = require('../models');
const ApiError = require('../utils/ApiError');
const { normalizePakistaniMobile, maskEmail } = require('../utils/phone');
const { ROLES, OTP_PURPOSES, AUDIT_ACTIONS, ENTITY_TYPES, AGENCY_STATUS } = require('../constants');
const tokenService = require('./token.service');
const { createSessionStore } = require('./sessionStore');
const otpService = require('./otp.service');
const audit = require('./audit.service');
const notification = require('./notification.service');

const sessions = createSessionStore({
  Model: User,
  tokens: tokenService,
  onReuse: (user) =>
    audit.record({
      performedBy: user._id,
      action: AUDIT_ACTIONS.REFRESH_TOKEN_REUSE,
      entityType: ENTITY_TYPES.USER,
      entityId: user._id,
    }),
});
const { SECRET_FIELDS } = sessions;

/** Finds a user by email or Pakistani mobile number. */
function findByIdentifier(identifier, select = '') {
  const value = String(identifier).trim();
  if (value.includes('@')) return User.findOne({ email: value.toLowerCase() }).select(select);
  const phone = normalizePakistaniMobile(value);
  if (!phone) return null;
  return User.findOne({ phone }).select(select);
}

async function buildSession(user) {
  const session = { user: user.toPublic() };
  if (user.role === ROLES.AGENCY) {
    const agency = await Agency.findOne({ userId: user._id }).select('verificationStatus vendorType businessName');
    session.agency = agency
      ? {
          id: agency._id.toString(),
          verificationStatus: agency.verificationStatus,
          vendorType: agency.vendorType,
          businessName: agency.businessName || null,
        }
      : null;
  }
  return session;
}

async function register({ fullName, email, phone, password, role, vendorType }) {
  const normalizedPhone = normalizePakistaniMobile(phone);
  const existing = await User.find({ $or: [{ email }, { phone: normalizedPhone }] }).select('email phone');
  if (existing.length) {
    const errors = [];
    if (existing.some((u) => u.email === email)) {
      errors.push({ field: 'email', message: 'This email is already registered' });
    }
    if (existing.some((u) => u.phone === normalizedPhone)) {
      errors.push({ field: 'phone', message: 'This mobile number is already registered' });
    }
    throw ApiError.conflict('An account with these details already exists', { code: 'DUPLICATE', errors });
  }

  const user = await User.create({ fullName, email, phone: normalizedPhone, password, role });

  if (role === ROLES.AGENCY) {
    try {
      await Agency.create({
        userId: user._id,
        vendorType,
        ownerName: fullName,
        email,
        phone: normalizedPhone,
        verificationStatus: AGENCY_STATUS.DRAFT,
      });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    entityType: ENTITY_TYPES.USER,
    entityId: user._id,
    metadata: { role, vendorType: vendorType || undefined },
  });

  let delivery;
  try {
    delivery = { ...(await otpService.issueOtp(user, OTP_PURPOSES.EMAIL_VERIFICATION)), sent: true };
  } catch (err) {
    if (err.code !== 'EMAIL_NOT_SENT') throw err;
    // The account exists now, so registering again would fail: let the user resend the code instead.
    delivery = { channel: 'email', destination: maskEmail(user.email), sent: false };
  }
  return { user: user.toPublic(), verification: { purpose: OTP_PURPOSES.EMAIL_VERIFICATION, ...delivery } };
}

async function login({ identifier, password }) {
  const user = await findByIdentifier(identifier, SECRET_FIELDS);
  // Same message for unknown account and wrong password, to prevent account enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email/mobile number or password', { code: 'INVALID_CREDENTIALS' });
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support.', {
      code: 'ACCOUNT_DISABLED',
    });
  }
  if (!user.isEmailVerified && !user.isPhoneVerified) {
    throw ApiError.forbidden('Please verify your account before logging in.', { code: 'ACCOUNT_NOT_VERIFIED' });
  }

  const tokens = await sessions.issue(user);
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
  return { ...(await buildSession(user)), ...tokens };
}

/**
 * Verifies an account OTP (email or phone). On success the user is signed in, since
 * they have just proven control of the registered contact.
 */
async function verifyAccountOtp({ identifier, otp, purpose }) {
  const user = await findByIdentifier(identifier, '+refreshTokenHash');
  if (!user) throw otpService.noActiveCodeError();

  await otpService.verifyOtp(user, purpose, otp);

  if (purpose === OTP_PURPOSES.PHONE_VERIFICATION) user.isPhoneVerified = true;
  else user.isEmailVerified = true;
  await user.save();

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.USER_VERIFIED,
    entityType: ENTITY_TYPES.USER,
    entityId: user._id,
    metadata: { purpose },
  });

  if (!user.isActive) return { ...(await buildSession(user)) };
  const tokens = await sessions.issue(user);
  return { ...(await buildSession(user)), ...tokens };
}

async function resendOtp({ identifier, purpose }) {
  const user = await findByIdentifier(identifier);
  // Do not reveal whether the account exists.
  if (!user) return { purpose };

  if (
    (purpose === OTP_PURPOSES.EMAIL_VERIFICATION && user.isEmailVerified) ||
    (purpose === OTP_PURPOSES.PHONE_VERIFICATION && user.isPhoneVerified)
  ) {
    throw ApiError.badRequest('This contact is already verified', { code: 'ALREADY_VERIFIED' });
  }

  const delivery = await otpService.issueOtp(user, purpose);
  return { purpose, ...delivery };
}

async function refresh(refreshToken) {
  const { account, ...tokens } = await sessions.rotate(refreshToken);
  return { ...(await buildSession(account)), ...tokens };
}

async function logout(refreshToken) {
  await sessions.revoke(refreshToken);
}

async function forgotPassword({ identifier }) {
  const user = await findByIdentifier(identifier);
  if (user && user.isActive) {
    try {
      await otpService.issueOtp(user, OTP_PURPOSES.PASSWORD_RESET);
    } catch (err) {
      // Swallow cooldown errors so the response never reveals whether the account exists.
      if (err.code !== 'OTP_COOLDOWN') throw err;
    }
  }
}

async function resetPassword({ identifier, otp, password }) {
  const user = await findByIdentifier(identifier, '+password');
  if (!user || !user.isActive) throw otpService.noActiveCodeError();

  await otpService.verifyOtp(user, OTP_PURPOSES.PASSWORD_RESET, otp);

  user.password = password;
  user.refreshTokenHash = null;
  user.previousRefreshTokenHash = null;
  // The reset code was delivered by email, which proves ownership of the address.
  user.isEmailVerified = true;
  await user.save();

  await audit.record({
    performedBy: user._id,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityType: ENTITY_TYPES.USER,
    entityId: user._id,
  });
  notification.notify(notification.sendEmail(user.email, 'passwordChanged', { name: user.fullName }));
}

module.exports = {
  register,
  login,
  verifyAccountOtp,
  resendOtp,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  buildSession,
};
