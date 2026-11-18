const { Joi, objectId, email, pakistaniMobile, pakistaniPhone } = require('./common');
const { VENDOR_TYPES, DOCUMENT_TYPES, PAKISTAN_PROVINCES } = require('../constants');

// Field rules shared by draft updates (all optional) and final submission (required set).
const fields = {
  vendorType: Joi.string()
    .valid(...Object.values(VENDOR_TYPES))
    .label('Vendor type'),
  businessName: Joi.string().trim().min(2).max(150).label('Business name'),
  ownerName: Joi.string().trim().min(2).max(100).label('Owner name'),
  description: Joi.string().trim().min(30).max(2000).label('Business description').messages({
    'string.min': 'Business description must be at least 30 characters',
  }),
  experience: Joi.number().integer().min(0).max(100).label('Years of experience'),

  email: email.label('Business email'),
  phone: pakistaniMobile.label('Mobile number'),
  whatsapp: pakistaniMobile.label('WhatsApp number'),
  officePhone: pakistaniPhone.allow('', null).label('Office phone'),
  website: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .max(200)
    .allow('', null)
    .label('Website')
    .messages({ 'string.uri': 'Website must be a valid URL starting with http:// or https://' }),

  country: Joi.string().trim().min(2).max(60).label('Country'),
  province: Joi.string().trim().min(2).max(60).label('Province'),
  city: Joi.string().trim().min(2).max(80).label('City'),
  address: Joi.string().trim().min(10).max(300).label('Office address'),
  postalCode: Joi.string()
    .trim()
    .pattern(/^\d{5}$/)
    .allow('', null)
    .label('Postal code')
    .messages({ 'string.pattern.base': 'Postal code must be 5 digits' }),
};

const provinceRule = (schema) =>
  schema.when('country', {
    is: Joi.string().trim().lowercase().valid('pakistan'),
    then: Joi.valid(...PAKISTAN_PROVINCES).messages({ 'any.only': 'Please select a valid province' }),
  });

/** Partial update while the application is editable (DRAFT / REJECTED). */
const updateAgency = Joi.object({ ...fields, province: provinceRule(fields.province) })
  .min(1)
  .messages({ 'object.min': 'Provide at least one field to update' });

/** Full validation applied to the stored application at submission time. */
const submission = Joi.object({
  vendorType: fields.vendorType.required(),
  businessName: fields.businessName.required(),
  ownerName: fields.ownerName.required(),
  description: fields.description.required(),
  experience: fields.experience.required(),
  email: fields.email.required(),
  phone: fields.phone.required(),
  whatsapp: fields.whatsapp.required(),
  officePhone: fields.officePhone,
  website: fields.website,
  country: fields.country.required(),
  province: provinceRule(fields.province.required()),
  city: fields.city.required(),
  address: fields.address.required(),
  postalCode: fields.postalCode,
});

const uploadDocument = Joi.object({
  documentType: Joi.string()
    .valid(...Object.keys(DOCUMENT_TYPES))
    .required()
    .label('Document type'),
});

const documentIdParam = Joi.object({ documentId: objectId.required() });

module.exports = { updateAgency, submission, uploadDocument, documentIdParam };
