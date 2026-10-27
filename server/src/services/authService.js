import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES, TOKEN_PURPOSE } from '../config/constants.js';
import { User } from '../models/User.js';
import { Token } from '../models/Token.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { sendMail, buildVerificationEmail, buildResetEmail } from '../utils/mailer.js';
import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from '../middleware/authenticate.js';

const REFRESH_COOKIE = 'cc_refresh';
export const ADMIN_REFRESH_COOKIE = 'cc_admin_refresh';
const MAX_FAILED_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

const cookieBase = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.cookieSecure,
  path: '/',
});

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, typ: 'access' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), typ: 'refresh' }, env.jwtSecret, {
    expiresIn: env.refreshTokenExpiresIn,
    algorithm: 'HS256',
  });
}

function refreshMaxAgeMs() {
  const m = /^(\d+)\s*([smhd])$/.exec(env.refreshTokenExpiresIn.trim());
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(m[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return value * unit;
}

export async function setAuthCookies(res, user, scope = 'customer') {
  const accessCookie = scope === 'admin' ? ADMIN_ACCESS_COOKIE : ACCESS_COOKIE;
  const refreshCookie = scope === 'admin' ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE;

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });

  res.cookie(accessCookie, accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  res.cookie(refreshCookie, refreshToken, { ...cookieBase(), maxAge: refreshMaxAgeMs() });
  return { accessToken, refreshToken };
}

export function clearAuthCookies(res, scope = 'customer') {
  const accessCookie = scope === 'admin' ? ADMIN_ACCESS_COOKIE : ACCESS_COOKIE;
  const refreshCookie = scope === 'admin' ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE;
  res.clearCookie(accessCookie, cookieBase());
  res.clearCookie(refreshCookie, cookieBase());
}

export async function refreshSession(rawRefreshToken) {
  let payload;
  try {
    payload = jwt.verify(rawRefreshToken, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
  if (payload.typ !== 'refresh') throw ApiError.unauthorized('Invalid session token');

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) throw ApiError.unauthorized('Session not found');
  if (user.refreshTokenHash !== hashToken(rawRefreshToken)) {
    // Token reuse / rotation mismatch — invalidate all sessions for safety.
    await User.updateOne({ _id: user._id }, { refreshTokenHash: null });
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.');
  }
  return user;
}

export async function registerCustomer({ name, email, password, phone }) {
  const existing = await User.findOne({ email });
  if (existing) {
    // Do not reveal whether the account exists — behave like a normal signup.
    if (existing.emailVerified) {
      throw ApiError.conflict('An account with this email already exists. Try signing in.');
    }
    if (phone && !existing.phone) {
      await User.updateOne({ _id: existing._id }, { phone });
      existing.phone = phone;
    }
    const verify = await issueVerification(existing);
    return { user: existing, resent: true, verify };
  }

  const user = new User({ name, email, phone, role: ROLES.CUSTOMER, emailVerified: false });
  await user.setPassword(password);
  await user.save();

  const verify = await issueVerification(user);
  return { user, resent: false, verify };
}

export async function issueVerification(user) {
  await Token.deleteMany({ user: user._id, purpose: TOKEN_PURPOSE.EMAIL_VERIFY, usedAt: null });
  const raw = generateToken(32);
  await Token.create({
    user: user._id,
    tokenHash: hashToken(raw),
    purpose: TOKEN_PURPOSE.EMAIL_VERIFY,
    expiresAt: new Date(Date.now() + env.emailTokenTtlMinutes * 60 * 1000),
  });

  const base = env.clientUrls[0] || 'http://localhost:5173';
  const verifyUrl = `${base}/verify-email?token=${raw}`;
  const mail = buildVerificationEmail({ name: user.name, verifyUrl });
  const result = await sendMail({ to: user.email, ...mail });
  return { verifyUrl, delivered: result.delivered };
}

export async function verifyEmail(rawToken) {
  const token = await Token.findOne({ tokenHash: hashToken(rawToken), purpose: TOKEN_PURPOSE.EMAIL_VERIFY });
  if (!token || !token.isUsable()) {
    throw ApiError.badRequest('This verification link is invalid or has expired.');
  }
  const user = await User.findById(token.user);
  if (!user) throw ApiError.badRequest('Account not found');

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  token.usedAt = new Date();
  await token.save();
  return user;
}

export async function resendVerification(email) {
  const user = await User.findOne({ email });
  // Generic response — never confirm whether the email exists.
  if (!user) return { delivered: false };
  if (user.emailVerified) return { delivered: false, alreadyVerified: true };
  return issueVerification(user);
}

export async function authenticateCustomer({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const genericError = ApiError.unauthorized('Invalid email or password');

  if (!user) {
    await User.findOne({}).select('+passwordHash').lean();
    throw genericError;
  }
  if (user.isLocked()) {
    throw ApiError.tooMany('Account temporarily locked after repeated failed attempts. Try again later.');
  }
  if (user.role !== ROLES.CUSTOMER) throw genericError;

  const ok = await user.verifyPassword(password);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
      logger.warn(`[auth] Account locked after repeated failures: ${user._id}`);
    }
    await user.save();
    throw genericError;
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function authenticateAdmin({ email, password }) {
  const user = await User.findOne({ email, role: ROLES.ADMIN }).select('+passwordHash');
  const genericError = ApiError.unauthorized('Invalid email or password');

  if (!user) throw genericError;
  if (user.isLocked()) {
    throw ApiError.tooMany('Account temporarily locked. Try again later.');
  }
  const ok = await user.verifyPassword(password);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
      logger.warn(`[auth] Admin account locked: ${user._id}`);
    }
    await user.save();
    throw genericError;
  }
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function logout(userId) {
  if (userId) await User.updateOne({ _id: userId }, { refreshTokenHash: null });
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return { delivered: false }; // generic response

  await Token.deleteMany({ user: user._id, purpose: TOKEN_PURPOSE.PASSWORD_RESET, usedAt: null });
  const raw = generateToken(32);
  await Token.create({
    user: user._id,
    tokenHash: hashToken(raw),
    purpose: TOKEN_PURPOSE.PASSWORD_RESET,
    expiresAt: new Date(Date.now() + env.resetTokenTtlMinutes * 60 * 1000),
  });

  const base = env.clientUrls[0] || 'http://localhost:5173';
  const resetUrl = `${base}/reset-password?token=${raw}`;
  const mail = buildResetEmail({ name: user.name, resetUrl });
  const result = await sendMail({ to: user.email, ...mail });
  return { delivered: result.delivered, resetUrl };
}

export async function resetPassword(rawToken, newPassword) {
  const token = await Token.findOne({ tokenHash: hashToken(rawToken), purpose: TOKEN_PURPOSE.PASSWORD_RESET });
  if (!token || !token.isUsable()) {
    throw ApiError.badRequest('This reset link is invalid or has expired.');
  }
  const user = await User.findById(token.user).select('+passwordHash');
  if (!user) throw ApiError.badRequest('Account not found');

  await user.setPassword(newPassword);
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.refreshTokenHash = null; // force re-login everywhere
  await user.save();

  token.usedAt = new Date();
  await token.save();
  return user;
}

export default {
  registerCustomer,
  verifyEmail,
  resendVerification,
  authenticateCustomer,
  authenticateAdmin,
  setAuthCookies,
  clearAuthCookies,
  refreshSession,
  logout,
  requestPasswordReset,
  resetPassword,
};
