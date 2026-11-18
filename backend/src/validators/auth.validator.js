const { Joi, email, pakistaniMobile, password, otp, identifier } = require('./common');
const { PUBLIC_ROLES, ROLES, VENDOR_TYPES, OTP_PURPOSES } = require('../constants');

const register = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().label('Full name'),
  email: email.required().label('Email'),
  phone: pakistaniMobile.required().label('Mobile number'),
  password: password.required().label('Password'),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().label('Confirm password').messages({
    'any.only': 'Passwords do not match',
  }),
  role: Joi.string()
    .valid(...PUBLIC_ROLES)
    .required()
    .label('Account type'),
  vendorType: Joi.when('role', {
    is: ROLES.AGENCY,
    then: Joi.string()
      .valid(...Object.values(VENDOR_TYPES))
      .required(),
    otherwise: Joi.forbidden(),
  }).label('Vendor type'),
});

const login = Joi.object({
  identifier: identifier.required(),
  password: Joi.string().max(128).required().label('Password'),
});

const verifyOtp = Joi.object({
  identifier: identifier.required(),
  otp: otp.required(),
  purpose: Joi.string()
    .valid(OTP_PURPOSES.EMAIL_VERIFICATION, OTP_PURPOSES.PHONE_VERIFICATION)
    .default(OTP_PURPOSES.EMAIL_VERIFICATION),
});

const resendOtp = Joi.object({
  identifier: identifier.required(),
  purpose: Joi.string()
    .valid(OTP_PURPOSES.EMAIL_VERIFICATION, OTP_PURPOSES.PHONE_VERIFICATION)
    .default(OTP_PURPOSES.EMAIL_VERIFICATION),
});

const forgotPassword = Joi.object({
  identifier: identifier.required(),
});

const resetPassword = Joi.object({
  identifier: identifier.required(),
  otp: otp.required(),
  password: password.required().label('New password'),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().label('Confirm password').messages({
    'any.only': 'Passwords do not match',
  }),
});

module.exports = { register, login, verifyOtp, resendOtp, forgotPassword, resetPassword };
