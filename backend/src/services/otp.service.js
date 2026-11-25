const bcrypt = require('bcrypt');
const { OTP } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { generateOtp } = require('../utils/crypto');
const { maskEmail, maskPhone } = require('../utils/phone');
const { OTP_PURPOSES } = require('../constants');
const notification = require('./notification.service');

const OTP_HASH_ROUNDS = 10;

function channelFor(purpose) {
  return purpose === OTP_PURPOSES.PHONE_VERIFICATION ? 'sms' : 'email';
}

/**
 * Creates a fresh OTP for (user, purpose), invalidating older ones, and delivers it.
 * Returns where the code was sent (masked).
 */
async function issueOtp(user, purpose) {
  const latest = await OTP.findOne({ userId: user._id, purpose, verifiedAt: null }).sort({ createdAt: -1 });
  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    const wait = Math.ceil(env.otp.resendCooldownSeconds - elapsed);
    if (wait > 0) {
      throw ApiError.tooMany(`Please wait ${wait} seconds before requesting a new code`, {
        code: 'OTP_COOLDOWN',
      });
    }
  }

  await OTP.deleteMany({ userId: user._id, purpose, verifiedAt: null });

  const code = generateOtp();
  const otp = await OTP.create({
    userId: user._id,
    purpose,
    otpHash: await bcrypt.hash(code, OTP_HASH_ROUNDS),
    expiresAt: new Date(Date.now() + env.otp.expiresInMinutes * 60 * 1000),
  });

  const channel = channelFor(purpose);
  if (channel === 'sms') {
    await notification.sendSms(
      user.phone,
      `Your UmrahConnect verification code is ${code}. It expires in ${env.otp.expiresInMinutes} minutes.`,
      { code, purpose },
    );
    return { channel, destination: maskPhone(user.phone) };
  }

  try {
    await notification.sendEmail(
      user.email,
      'otp',
      { name: user.fullName, code, purpose, minutes: env.otp.expiresInMinutes },
      { required: true },
    );
  } catch (err) {
    // The code never reached the user: drop it so the resend cooldown does not block a retry.
    await OTP.deleteOne({ _id: otp._id });
    if (err.code === 'EMAIL_NOT_SENT') {
      throw new ApiError(502, "We couldn't send your verification code. Please try again in a moment.", {
        code: 'EMAIL_NOT_SENT',
      });
    }
    throw err;
  }
  return { channel, destination: maskEmail(user.email) };
}

/**
 * Error for "no usable code". Also thrown for unknown accounts, so the response never
 * reveals whether an account exists.
 */
const noActiveCodeError = () =>
  ApiError.badRequest('This code has expired. Please request a new one.', { code: 'OTP_EXPIRED' });

/** Verifies and consumes an OTP. Throws a descriptive ApiError on failure. */
async function verifyOtp(user, purpose, code) {
  const otp = await OTP.findOne({ userId: user._id, purpose, verifiedAt: null }).sort({ createdAt: -1 });

  if (!otp || otp.expiresAt < new Date()) throw noActiveCodeError();
  if (otp.attempts >= env.otp.maxAttempts) {
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.', { code: 'OTP_LOCKED' });
  }

  const matches = await bcrypt.compare(String(code), otp.otpHash);
  if (!matches) {
    otp.attempts += 1;
    await otp.save();
    const remaining = env.otp.maxAttempts - otp.attempts;
    throw ApiError.badRequest(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.',
      { code: remaining > 0 ? 'INVALID_OTP' : 'OTP_LOCKED' },
    );
  }

  otp.verifiedAt = new Date();
  await otp.save();
}

module.exports = { issueOtp, verifyOtp, noActiveCodeError };
