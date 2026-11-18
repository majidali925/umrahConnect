const mongoose = require('mongoose');
const { OTP_PURPOSES } = require('../constants');

const otpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    otpHash: { type: String, required: true },
    purpose: { type: String, enum: Object.values(OTP_PURPOSES), required: true },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

otpSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
// MongoDB removes expired OTP documents automatically (shortly after expiry).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
