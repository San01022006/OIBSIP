import { env } from '../config/env.js';
import { Ingredient } from '../models/Ingredient.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { sendMail, buildLowStockEmail, isRealMailerConfigured } from '../utils/mailer.js';
import { logger } from '../utils/logger.js';

/**
 * Run a low-stock check and email administrators about items at/below their
 * configured threshold. Repeated runs while an item stays low do NOT resend.
 * A fresh alert is sent only after the item recovers and drops again.
 */
export async function runInventoryAlertCheck() {
  const ingredients = await Ingredient.find({ available: true }).lean();
  const logs = await NotificationLog.find({}).lean();
  const logsByIngredient = new Map(logs.map((l) => [String(l.ingredient), l]));

  const low = ingredients.filter((i) => i.stock <= i.lowStockThreshold);

  const summary = { checked: ingredients.length, lowStock: low.length, notified: [], resolved: [], errors: [] };

  for (const item of low) {
    const existing = logsByIngredient.get(String(item._id));
    if (existing?.state === 'low_active') continue; // already alerted, do not spam

    const mail = buildLowStockEmail({ item });
    const result = await sendMail({ to: env.admin.email, ...mail });

    await NotificationLog.findOneAndUpdate(
      { ingredient: item._id },
      {
        $set: {
          state: 'low_active',
          thresholdAtAlert: item.lowStockThreshold,
          quantityAtAlert: item.stock,
          lastNotifiedAt: new Date(),
          lastDeliveryOk: result.delivered,
          lastError: result.error || null,
        },
        $inc: { emailsSent: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    summary.notified.push({ id: item._id, name: item.name, stock: item.stock, threshold: item.lowStockThreshold, delivered: result.delivered });
    if (result.error) summary.errors.push({ id: item._id, error: result.error });
    logger.info(`[alerts] Low-stock alert sent for ${item.name} (stock ${item.stock} ≤ ${item.lowStockThreshold})`);
  }

  for (const log of logs) {
    if (log.state !== 'low_active') continue;
    const item = ingredients.find((i) => String(i._id) === String(log.ingredient));
    if (!item || item.stock > item.lowStockThreshold) {
      await NotificationLog.updateOne(
        { _id: log._id },
        { $set: { state: 'resolved', lastResolvedAt: new Date() } }
      );
      summary.resolved.push(log.ingredient);
    }
  }

  return summary;
}

export function getAlertRecipient() {
  return env.admin.email;
}

export function isMailDeliverable() {
  return isRealMailerConfigured();
}

export default { runInventoryAlertCheck, getAlertRecipient, isMailDeliverable };
