/**
 * One-off migration: moves legacy SUPER_ADMIN accounts out of `users` into `admins`.
 *
 *   npm run migrate:admins
 *
 * For each user with role SUPER_ADMIN it:
 *   1. copies the account into `admins` with the SAME _id and the existing bcrypt hash
 *      (so the password keeps working and references stay valid),
 *   2. marks that account's audit-log entries as performed by an Admin,
 *   3. removes the account (and its OTPs) from `users`.
 * Existing sessions are not carried over: admins sign in again through the admin panel.
 * Safe to re-run; it does nothing once no SUPER_ADMIN users remain.
 */
const env = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { User, Admin, AuditLog, OTP } = require('../models');
const { ADMIN_ROLES } = require('../constants');

async function run() {
  await connectDatabase(env.mongoUri);
  try {
    // Raw collection access: `SUPER_ADMIN` is no longer a valid User role in the schema.
    const legacy = await User.collection.find({ role: ADMIN_ROLES.SUPER_ADMIN }).toArray();
    if (!legacy.length) {
      console.log('[migrate] No SUPER_ADMIN users found. Nothing to do.');
      return;
    }

    for (const user of legacy) {
      if (!(await Admin.exists({ _id: user._id }))) {
        if (await Admin.exists({ email: user.email })) {
          console.warn(`[migrate] Skipping ${user.email}: an admin with this email already exists.`);
          continue;
        }
        // Insert raw so the already-hashed password is not hashed a second time.
        await Admin.collection.insertOne({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          password: user.password,
          role: ADMIN_ROLES.SUPER_ADMIN,
          isActive: user.isActive !== false,
          refreshTokenHash: null,
          previousRefreshTokenHash: null,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }

      const { modifiedCount } = await AuditLog.updateMany(
        { performedBy: user._id },
        { $set: { performedByModel: 'Admin' } },
      );
      await OTP.deleteMany({ userId: user._id });
      await User.collection.deleteOne({ _id: user._id });
      console.log(`[migrate] Moved ${user.email} to admins (${modifiedCount} audit entries re-linked).`);
    }
  } finally {
    await disconnectDatabase();
  }
}

run().catch((err) => {
  console.error(`[migrate] ${err.message}`);
  process.exitCode = 1;
  disconnectDatabase().catch(() => {});
});
