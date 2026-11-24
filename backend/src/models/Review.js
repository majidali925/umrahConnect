const mongoose = require('mongoose');

/**
 * A customer's rating of an agency. Only a customer whose booking (a CONFIRMED quotation)
 * has been completed can write one, and only one per booking, so every review comes from
 * a real trip with that agency.
 */
const reviewSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 },
    // Package title at the time of review, so the review still reads well if the package is deleted.
    packageTitle: { type: String, trim: true, maxlength: 150 },
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

reviewSchema.index({ agencyId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
