import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let transporter = null;

/**
 * Build a Nodemailer transport from an SMTP config. Exported so it can be
 * unit-tested (and diagnosed) without touching the cached singleton.
 */
export function createTransporter(smtp = env.smtp) {
  if (smtp.host) {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

function getTransporter() {
  if (!transporter) transporter = createTransporter();
  return transporter;
}

export function isRealMailerConfigured() {
  return Boolean(env.smtp.host);
}

function sanitizeMailError(message) {
  let out = String(message || 'Unknown mailer error');
  for (const secret of [env.smtp.pass, env.smtp.user]) {
    if (secret) out = out.split(secret).join('[redacted]');
  }
  return out;
}

export async function verifyMailer({ transport } = {}) {
  if (!isRealMailerConfigured()) {
    return {
      configured: false,
      ok: false,
      reason: 'SMTP is not configured — using the development JSON/console transport.',
    };
  }
  try {
    await (transport || getTransporter()).verify();
    return { configured: true, ok: true };
  } catch (err) {
    return { configured: true, ok: false, error: sanitizeMailError(err.message), code: err.code };
  }
}

/**
 * Send an email. Never throws — delivery problems are logged and reported via
 * `{ delivered: false, error }` so callers can decide how to react. When SMTP
 * is not configured the message payload is logged (development only) so the
 * developer can copy verification / reset links from the console.
 */
export async function sendMail({ to, subject, text, html }, { transport } = {}) {
  const real = isRealMailerConfigured();
  const message = { from: env.mailFrom, to, subject, text, html };

  try {
    const info = await (transport || getTransporter()).sendMail(message);
    if (!real) {
      logger.info(`[mail:dev] Email to ${to} — "${subject}" (SMTP not configured; not delivered)`);
      // Only surface the body (which may contain a verification link) outside
      // production, and never when it could leak in a real deployment.
      if (text && !env.isProd) logger.debug(`[mail:dev] ${text}`);
    } else {
      logger.info(`[mail] Sent "${subject}" to ${to} (${info.messageId})`);
    }
    return {
      delivered: real,
      messageId: info.messageId,
      preview: real ? undefined : text,
    };
  } catch (err) {
    logger.error(`[mail] Failed to send "${subject}" to ${to}: ${sanitizeMailError(err.message)}`);
    return { delivered: false, error: sanitizeMailError(err.message) };
  }
}

export function buildVerificationEmail({ name, verifyUrl }) {
  return {
    subject: 'Verify your Crust & Craft account',
    text: `Hi ${name},\n\nWelcome to Crust & Craft! Please verify your email address by opening this link:\n\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>Welcome to <strong>Crust &amp; Craft</strong>! Please verify your email address:</p><p><a href="${verifyUrl}">Verify my email</a></p><p>If the button does not work, copy this link:<br>${verifyUrl}</p>`,
  };
}

export function buildResetEmail({ name, resetUrl }) {
  return {
    subject: 'Reset your Crust & Craft password',
    text: `Hi ${name},\n\nWe received a request to reset your password. Open this link to choose a new password:\n\n${resetUrl}\n\nThis link expires shortly. If you did not request it, ignore this email.`,
    html: `<p>Hi ${name},</p><p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset my password</a></p><p>If the button does not work, copy this link:<br>${resetUrl}</p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

export function buildLowStockEmail({ item }) {
  return {
    subject: `Low stock alert: ${item.name}`,
    text: `Inventory alert\n\nItem: ${item.name}\nCategory: ${item.category}\nCurrent quantity: ${item.stock} ${item.unit}\nConfigured threshold: ${item.lowStockThreshold} ${item.unit}\n\nPlease restock soon.`,
    html: `<h3>Low stock alert</h3><ul><li><strong>Item:</strong> ${item.name}</li><li><strong>Category:</strong> ${item.category}</li><li><strong>Current quantity:</strong> ${item.stock} ${item.unit}</li><li><strong>Threshold:</strong> ${item.lowStockThreshold} ${item.unit}</li></ul><p>Please restock soon.</p>`,
  };
}

export default { sendMail, isRealMailerConfigured, verifyMailer, createTransporter };
