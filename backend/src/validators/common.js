const Joi = require('joi');
const { normalizePakistaniMobile, normalizePakistaniPhone } = require('../utils/phone');

const objectId = Joi.string().hex().length(24).messages({ 'string.length': '{{#label}} must be a valid id' });

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254);

const pakistaniMobile = Joi.string()
  .trim()
  .custom((value, helpers) => normalizePakistaniMobile(value) || helpers.error('phone.invalid'))
  .messages({ 'phone.invalid': '{{#label}} must be a valid Pakistani mobile number (e.g. 03001234567)' });

const pakistaniPhone = Joi.string()
  .trim()
  .custom((value, helpers) => normalizePakistaniPhone(value) || helpers.error('phone.invalid'))
  .messages({ 'phone.invalid': '{{#label}} must be a valid Pakistani phone number (e.g. 0421234567)' });

// bcrypt only uses the first 72 bytes, so longer passwords are rejected.
const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/\d/, 'number')
  .messages({
    'string.pattern.name': '{{#label}} must contain at least one {#name}',
    'string.min': '{{#label}} must be at least 8 characters',
  });

const otp = Joi.string().trim().pattern(/^\d{6}$/).messages({ 'string.pattern.base': 'Code must be 6 digits' });

const identifier = Joi.string().trim().min(3).max(254).messages({
  'any.required': 'Email or mobile number is required',
  'string.empty': 'Email or mobile number is required',
});

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const reason = Joi.string().trim().min(10).max(1000).messages({
  'string.min': 'Please provide a reason of at least 10 characters',
});

module.exports = { Joi, objectId, email, pakistaniMobile, pakistaniPhone, password, otp, identifier, pagination, reason };
