const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ADMIN_ROLES } = require('../constants');

const SALT_ROUNDS = 12;

/**
 * Platform administrator. Stored apart from marketplace users (`users`): admins cannot
 * register, cannot sign in through /auth, and authenticate with their own JWT secrets.
 */
const adminSchema = new mongoose.Schema(
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
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ADMIN_ROLES), required: true, default: ADMIN_ROLES.SUPER_ADMIN },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false, default: null },
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

adminSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

adminSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

adminSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Admin', adminSchema);
