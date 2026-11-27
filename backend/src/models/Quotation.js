const mongoose = require('mongoose');
const { QUOTATION_STATUS } = require('../constants');

/**
 * A customer's request for seats on a package. No payment is involved: the agency reviews
 * the request and is the only party that can confirm it.
 */
const quotationSchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    seats: { type: Number, min: 1, max: 1000, required: true },
    message: { type: String, trim: true, maxlength: 1000 },

    // Snapshot at request time, so later price edits don't change an existing quotation.
    pricePerPerson: { type: Number, min: 1, required: true },
    estimatedTotal: { type: Number, min: 1, required: true },

    status: { type: String, enum: Object.values(QUOTATION_STATUS), default: QUOTATION_STATUS.PENDING, required: true },
    agencyNote: { type: String, trim: true, maxlength: 1000 },
    // PLATFORM: cancelled automatically because an admin suspended the agency.
    cancelledBy: { type: String, enum: ['CUSTOMER', 'AGENCY', 'PLATFORM'] },
    respondedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

quotationSchema.index({ agencyId: 1, status: 1, createdAt: -1 });
quotationSchema.index({ customerId: 1, createdAt: -1 });
// At most one open (pending) request per customer per package.
quotationSchema.index(
  { packageId: 1, customerId: 1 },
  { unique: true, partialFilterExpression: { status: QUOTATION_STATUS.PENDING } },
);

module.exports = mongoose.model('Quotation', quotationSchema);
