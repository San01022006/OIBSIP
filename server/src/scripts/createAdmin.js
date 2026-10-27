import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const WEAK_PASSWORDS = ['ChangeMe_Str0ng!Pass', 'password', 'admin', 'admin123'];

/**
 * Provision (or update the password of) the initial admin from environment
 * variables. Safe to re-run. Refuses weak/default passwords in production.
 */
export async function createAdmin() {
  const { name, email, password } = env.admin;

  if (env.isProd && WEAK_PASSWORDS.includes(password)) {
    throw new Error('Refusing to create an admin with the default password in production. Set ADMIN_PASSWORD.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  let user = await User.findOne({ email });
  if (user) {
    await user.setPassword(password);
    user.role = ROLES.ADMIN;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.name = name;
    await user.save();
    logger.info(`[admin] Updated existing admin account: ${email}`);
    return user;
  }

  user = new User({
    name,
    email,
    role: ROLES.ADMIN,
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });
  await user.setPassword(password);
  await user.save();
  logger.info(`[admin] Created admin account: ${email}`);
  return user;
}

async function run() {
  try {
    await connectDatabase();
    const admin = await createAdmin();
    logger.info(`[admin] Ready — sign in at /admin/login with ${admin.email}`);
  } catch (err) {
    logger.error(`[admin] Failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
    await mongoose.disconnect().catch(() => {});
  }
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('createAdmin.js');
if (isDirectRun) run();

export default createAdmin;
