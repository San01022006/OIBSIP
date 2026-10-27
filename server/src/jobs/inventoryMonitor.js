import cron from 'node-cron';
import { env } from '../config/env.js';
import { acquireLock, releaseLock } from '../models/SchedulerLock.js';
import { runInventoryAlertCheck } from '../services/notificationService.js';
import { releaseExpiredReservations } from '../services/inventoryService.js';
import { logger } from '../utils/logger.js';

const LOCK_NAME = 'inventory-monitor';
const LOCK_TTL_MS = 4 * 60 * 1000;

let task = null;

async function tick() {
  const owner = `${process.pid}-${Date.now()}`;
  const acquired = await acquireLock(LOCK_NAME, LOCK_TTL_MS, owner);
  if (!acquired) {
    logger.debug('[cron] Inventory monitor skipped (another instance holds the lock)');
    return;
  }
  try {
    const alerts = await runInventoryAlertCheck();
    if (alerts.lowStock > 0) {
      logger.info(`[cron] Inventory check: ${alerts.lowStock} low item(s), ${alerts.notified.length} alert(s) sent`);
    }
    await releaseExpiredReservations();
  } catch (err) {
    logger.error(`[cron] Inventory monitor failed: ${err.message}`);
  } finally {
    await releaseLock(LOCK_NAME);
  }
}

/** Start the single controlled scheduler (no-op in test or when disabled). */
export function startInventoryMonitor() {
  if (!env.inventory.enabled) {
    logger.info('[cron] Inventory monitor disabled');
    return null;
  }
  if (!cron.validate(env.inventory.cron)) {
    logger.error(`[cron] Invalid INVENTORY_CRON expression: ${env.inventory.cron}`);
    return null;
  }
  task = cron.schedule(env.inventory.cron, tick, { scheduled: true });
  logger.info(`[cron] Inventory monitor scheduled (${env.inventory.cron})`);
  return task;
}

export function stopInventoryMonitor() {
  if (task) {
    task.stop();
    task = null;
    logger.info('[cron] Inventory monitor stopped');
  }
}

export { tick as runInventoryTick };

export default { startInventoryMonitor, stopInventoryMonitor };
