const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../constants');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    // Stored normalized as +923XXXXXXXXX
    phone: { type: String, required: true, unique: true, match: /^\+923\d{9}$/ },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, default: ROLES.CUSTOMER },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false, default: null },
    // Previous token hash, accepted for a short grace window after rotation so concurrent
    // refresh requests (e.g. two tabs) are not mistaken for token theft.
    previousRefreshTokenHash: { type: String, select: false, default: null },
    refreshTokenRotatedAt: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.previousRefreshTokenHash;
        delete ret.refreshTokenRotatedAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, createdAt: -1 });

userSchema.virtual('isVerified').get(function isVerified() {
  return this.isEmailVerified || this.isPhoneVerified;
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Safe public representation used in API responses. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isEmailVerified: this.isEmailVerified,
    isPhoneVerified: this.isPhoneVerified,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
