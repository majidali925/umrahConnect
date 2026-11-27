const mongoose = require('mongoose');
const { FEATURE_REQUEST_STATUS } = require('../constants');

// The application as submitted: filled in automatically from the agency and package, so the
// admin sees exactly what was asked for even if either is edited or deleted later.
const applicationSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true },
    contactName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    packageTitle: { type: String, trim: true },
    departureCity: { type: String, trim: true },
    departureDate: { type: Date },
    returnDate: { type: Date },
    pricePerPerson: { type: Number },
  },
  { _id: false },
);

// Optional screenshot or PDF of the payment, stored privately (see storage.service).
const paymentProofSchema = new mongoose.Schema(
  {
    storageProvider: { type: String, enum: ['cloudinary', 'local'], required: true },
    storageKey: { type: String, required: true },
    storageResourceType: { type: String },
    originalFileName: { type: String, trim: true, maxlength: 255, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/**
 * An agency's request to feature one of its packages. An admin approves it (the featured
 * period starts then) or rejects it. Payment is made outside the app; attaching proof of it
 * moves the request to the front of the admin's queue.
 */
const featureRequestSchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Kept so the request still makes sense to an admin if the package is later deleted.
    packageTitle: { type: String, trim: true, maxlength: 150, required: true },

    application: { type: applicationSchema, required: true },

    days: { type: Number, min: 1, max: 60, required: true },
    // Fee at the time of the request, in whole PKR.
    price: { type: Number, min: 0, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    paymentProof: { type: paymentProofSchema },
    // Stored (not derived) so the admin queue can sort requests with proof first.
    hasPaymentProof: { type: Boolean, default: false },

    status: {
      type: String,
      enum: Object.values(FEATURE_REQUEST_STATUS),
      default: FEATURE_REQUEST_STATUS.PENDING,
      required: true,
    },
    // The admin's note on approval, or the reason for rejecting or ending it early.
    decisionNote: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: { type: Date },

    // Set on approval. endsAt is moved to the moment an admin ends the featuring early.
    startsAt: { type: Date },
    endsAt: { type: Date },
    endedEarlyAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.id;
        // Never expose where the file is stored; it is streamed through an admin endpoint.
        if (ret.paymentProof) {
          const { originalFileName, mimeType, size, uploadedAt } = ret.paymentProof;
          ret.paymentProof = { originalFileName, mimeType, size, uploadedAt };
        }
        return ret;
      },
    },
  },
);

/** PENDING, ACTIVE, ENDED, REJECTED or CANCELLED: an approved request is ACTIVE until endsAt. */
function featureState(request, now = new Date()) {
  if (request.status !== FEATURE_REQUEST_STATUS.APPROVED) return request.status;
  return request.endsAt > now ? 'ACTIVE' : 'ENDED';
}

featureRequestSchema.virtual('state').get(function state() {
  return featureState(this);
});

// At most one request per package awaiting an admin.
featureRequestSchema.index(
  { packageId: 1 },
  { unique: true, partialFilterExpression: { status: FEATURE_REQUEST_STATUS.PENDING } },
);
featureRequestSchema.index({ packageId: 1, createdAt: -1 });
featureRequestSchema.index({ status: 1, createdAt: -1 });
featureRequestSchema.index({ status: 1, hasPaymentProof: -1, createdAt: 1 });
featureRequestSchema.index({ agencyId: 1, createdAt: -1 });

const FeatureRequest = mongoose.model('FeatureRequest', featureRequestSchema);
FeatureRequest.featureState = featureState;

module.exports = FeatureRequest;
