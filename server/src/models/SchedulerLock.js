import mongoose from 'mongoose';

/**
 * Simple lease-based lock so that only one application instance runs a given
 * scheduled job at a time (prevents duplicate low-stock emails and schedulers).
 */
const schedulerLockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    lockedUntil: { type: Date, default: null },
    owner: { type: String, default: null },
  },
  { timestamps: true }
);

export const SchedulerLock = mongoose.model('SchedulerLock', schedulerLockSchema);

/**
 * Try to acquire a lock. Returns true when acquired.
 * Uses an atomic findOneAndUpdate conditioned on the lock being free/expired.
 */
export async function acquireLock(name, ttlMs, owner = process.pid.toString()) {
  const now = new Date();
  const until = new Date(now.getTime() + ttlMs);
  const res = await SchedulerLock.findOneAndUpdate(
    { name, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    { $set: { lockedUntil: until, owner } },
    { new: true }
  );
  if (res) return true;
  // Ensure the document exists for next time.
  await SchedulerLock.updateOne({ name }, { $setOnInsert: { lockedUntil: null } }, { upsert: true });
  return false;
}

export async function releaseLock(name) {
  await SchedulerLock.updateOne({ name }, { $set: { lockedUntil: null, owner: null } });
}

export default { acquireLock, releaseLock, SchedulerLock };
