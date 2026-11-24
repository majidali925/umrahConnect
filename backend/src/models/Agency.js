const mongoose = require('mongoose');
const { imageSchema, imageToJSON } = require('./imageSchema');
const { VENDOR_TYPES, AGENCY_STATUS } = require('../constants');

// Business fields are optional while the application is a DRAFT (filled step by step)
// and become required once it leaves DRAFT.
function requiredAfterDraft() {
  return this.verificationStatus !== AGENCY_STATUS.DRAFT;
}

const agencySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vendorType: { type: String, enum: Object.values(VENDOR_TYPES), required: true },

    // Step 1 — business information
    businessName: { type: String, trim: true, maxlength: 150, required: requiredAfterDraft },
    ownerName: { type: String, trim: true, maxlength: 100, required: requiredAfterDraft },
    description: { type: String, trim: true, maxlength: 2000, required: requiredAfterDraft },
    experience: { type: Number, min: 0, max: 100, required: requiredAfterDraft },

    // Step 2 — contact information
    email: { type: String, trim: true, lowercase: true, maxlength: 254, required: requiredAfterDraft },
    phone: { type: String, trim: true, required: requiredAfterDraft },
    whatsapp: { type: String, trim: true, required: requiredAfterDraft },
    officePhone: { type: String, trim: true },
    website: { type: String, trim: true, maxlength: 200 },

    // Step 3 — business address
    country: { type: String, trim: true, default: 'Pakistan' },
    province: { type: String, trim: true, required: requiredAfterDraft },
    city: { type: String, trim: true, maxlength: 80, required: requiredAfterDraft },
    address: { type: String, trim: true, maxlength: 300, required: requiredAfterDraft },
    postalCode: { type: String, trim: true, maxlength: 10 },

    // Verification workflow
    verificationStatus: {
      type: String,
      enum: Object.values(AGENCY_STATUS),
      default: AGENCY_STATUS.DRAFT,
      required: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    suspensionReason: { type: String, trim: true, maxlength: 1000 },
    submittedAt: { type: Date },
    reviewStartedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    suspendedAt: { type: Date },

    // Banner photo shown at the top of the agency's public page.
    headerImage: { type: imageSchema },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        ret.headerImage = imageToJSON(ret.headerImage);
        return ret;
      },
    },
  },
);

agencySchema.index({ verificationStatus: 1, createdAt: -1 });
agencySchema.index({ vendorType: 1, verificationStatus: 1 });
agencySchema.index({ businessName: 1 });
agencySchema.index({ city: 1 });

module.exports = mongoose.model('Agency', agencySchema);
