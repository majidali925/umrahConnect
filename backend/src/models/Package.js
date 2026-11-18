const mongoose = require('mongoose');
const { PACKAGE_STATUS, ROOM_TYPES, PACKAGE_INCLUSIONS } = require('../constants');

const DAY_MS = 24 * 60 * 60 * 1000;

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 150, required: true },
    stars: { type: Number, min: 1, max: 5, required: true },
    // Walking distance from the Haram, in metres.
    distanceMeters: { type: Number, min: 0, max: 50000, required: true },
    nights: { type: Number, min: 0, max: 60, required: true },
  },
  { _id: false },
);

const packageSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, trim: true, maxlength: 150, required: true },
    description: { type: String, trim: true, maxlength: 3000, required: true },
    departureCity: { type: String, trim: true, maxlength: 80, required: true },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },

    makkahHotel: { type: hotelSchema, required: true },
    madinahHotel: { type: hotelSchema, required: true },

    roomType: { type: String, enum: Object.values(ROOM_TYPES), required: true },
    // Whole Pakistani rupees per person. Shown as a quotation basis only; no payment is taken.
    pricePerPerson: { type: Number, min: 1, required: true },
    inclusions: [{ type: String, enum: Object.values(PACKAGE_INCLUSIONS) }],

    // Seat quota. bookedSeats only changes when an agency confirms or cancels a booking,
    // through conditional atomic updates so it can never exceed totalSeats.
    totalSeats: { type: Number, min: 1, max: 1000, required: true },
    bookedSeats: { type: Number, min: 0, default: 0 },

    status: { type: String, enum: Object.values(PACKAGE_STATUS), default: PACKAGE_STATUS.DRAFT, required: true },
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  },
);

packageSchema.virtual('availableSeats').get(function availableSeats() {
  return Math.max((this.totalSeats || 0) - (this.bookedSeats || 0), 0);
});

packageSchema.virtual('durationDays').get(function durationDays() {
  if (!this.departureDate || !this.returnDate) return null;
  return Math.round((this.returnDate - this.departureDate) / DAY_MS) + 1;
});

/** A package whose departure has passed can no longer be published or requested. */
packageSchema.virtual('isExpired').get(function isExpired() {
  return Boolean(this.departureDate) && this.departureDate <= new Date();
});

packageSchema.index({ agencyId: 1, createdAt: -1 });
packageSchema.index({ status: 1, departureDate: 1 });
packageSchema.index({ departureCity: 1 });

module.exports = mongoose.model('Package', packageSchema);
