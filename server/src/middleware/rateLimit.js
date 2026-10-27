import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const handler = (_req, _res, next) =>
  next(ApiError.tooMany('Too many requests. Please slow down and try again later.'));

const factory = ({ windowMs, max, prefix }) =>
  rateLimit({
    windowMs,
    max: env.isTest ? 1000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    keyGenerator: (req) => `${prefix}:${req.ip}`,
  });

/** Broad limiter applied to all API routes. */
export const apiLimiter = factory({ windowMs: 15 * 60 * 1000, max: 300, prefix: 'api' });

/** Stricter limiter for authentication endpoints. */
export const authLimiter = factory({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'auth' });

/** Very strict limiter for login attempts. */
export const loginLimiter = factory({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'login' });

/** Limiter for email sending endpoints (register/resend/forgot). */
export const emailLimiter = factory({ windowMs: 60 * 60 * 1000, max: 8, prefix: 'email' });

/** Limiter for payment endpoints. */
export const paymentLimiter = factory({ windowMs: 15 * 60 * 1000, max: 40, prefix: 'pay' });

export default { apiLimiter, authLimiter, loginLimiter, emailLimiter, paymentLimiter };
