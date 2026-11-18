/**
 * Creates a platform admin in the separate `admins` collection. There is no public route for this.
 *
 * Usage (credentials come from the environment, never from source code):
 *   SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD='Str0ngPass123' \
 *   SUPER_ADMIN_NAME='Platform Admin' npm run seed:admin
 *
 * The script refuses to run if an admin with that email already exists, or if a super admin
 * already exists (pass ALLOW_ADDITIONAL_ADMIN=true to add another one deliberately).
 */
const env = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { Admin } = require('../models');
const audit = require('../services/audit.service');
const { password: passwordRule, email: emailRule } = require('../validators/common');
const { ADMIN_ROLES, AUDIT_ACTIONS, ENTITY_TYPES } = require('../constants');

function fail(message) {
  console.error(`[seed] ${message}`);
  process.exitCode = 1;
}

async function run() {
  const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME, ALLOW_ADDITIONAL_ADMIN } = process.env;
  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    return fail('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set.');
  }

  const emailCheck = emailRule.validate(SUPER_ADMIN_EMAIL);
  const passwordCheck = passwordRule.min(12).validate(SUPER_ADMIN_PASSWORD);
  if (emailCheck.error) return fail(`Invalid SUPER_ADMIN_EMAIL: ${emailCheck.error.message}`);
  if (passwordCheck.error) {
    return fail('SUPER_ADMIN_PASSWORD must be at least 12 characters and contain letters and numbers.');
  }

  await connectDatabase(env.mongoUri);
  try {
    if (ALLOW_ADDITIONAL_ADMIN !== 'true' && (await Admin.exists({ role: ADMIN_ROLES.SUPER_ADMIN }))) {
      return fail('A super admin already exists. Set ALLOW_ADDITIONAL_ADMIN=true to add another. Aborting.');
    }
    if (await Admin.exists({ email: emailCheck.value })) {
      return fail('An admin with this email already exists. Aborting without changes.');
    }

    const admin = await Admin.create({
      fullName: SUPER_ADMIN_NAME || 'Super Admin',
      email: emailCheck.value,
      password: SUPER_ADMIN_PASSWORD,
      role: ADMIN_ROLES.SUPER_ADMIN,
    });
    await audit.record({
      action: AUDIT_ACTIONS.SUPER_ADMIN_SEEDED,
      entityType: ENTITY_TYPES.ADMIN,
      entityId: admin._id,
      metadata: { email: admin.email },
    });
    console.log(`[seed] Super admin created: ${admin.email}`);
  } finally {
    await disconnectDatabase();
  }
}

run().catch((err) => {
  fail(err.message);
  disconnectDatabase().catch(() => {});
});
