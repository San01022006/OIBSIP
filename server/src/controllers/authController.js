import * as authService from '../services/authService.js';
import { isRealMailerConfigured } from '../utils/mailer.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ACCESS_COOKIE } from '../middleware/authenticate.js';

const devHint = (payload) =>
  !isRealMailerConfigured() && !env.isProd ? payload : {};

export async function register(req, res) {
  const { name, email, password, phone } = req.body;
  const { user, resent, verify } = await authService.registerCustomer({ name, email, password, phone });

  const delivered = Boolean(verify?.delivered);
  const base = resent
    ? 'Account already exists but is unverified.'
    : 'Registration successful.';
  const message = delivered
    ? `${base} A verification email has been sent — please check your inbox.`
    : `${base} We could not send the verification email automatically; use "Resend verification" to try again.`;

  res.status(201).json({
    success: true,
    data: {
      user: user.toPublicJSON(),
      emailDelivered: delivered,
      message,
      ...devHint({ devVerificationUrl: verify?.verifyUrl }),
    },
  });
}

export async function verifyEmail(req, res) {
  const user = await authService.verifyEmail(req.body.token);
  res.json({
    success: true,
    data: { user: user.toPublicJSON(), message: 'Email verified. You can now sign in.' },
  });
}

export async function resendVerification(req, res) {
  const result = await authService.resendVerification(req.body.email);
  res.json({
    success: true,
    data: {
      message: 'If an unverified account exists for that email, a verification link has been sent.',
      ...devHint(result.verifyUrl ? { devVerificationUrl: result.verifyUrl } : {}),
    },
  });
}

export async function login(req, res) {
  const user = await authService.authenticateCustomer(req.body);
  await authService.setAuthCookies(res, user);
  res.json({ success: true, data: { user: user.toPublicJSON(), message: 'Signed in successfully' } });
}

export async function refresh(req, res) {
  const token = req.cookies?.cc_refresh;
  if (!token) throw ApiError.unauthorized('No active session');
  const user = await authService.refreshSession(token);
  await authService.setAuthCookies(res, user);
  res.json({ success: true, data: { user: user.toPublicJSON() } });
}

export async function logout(req, res) {
  await authService.logout(req.user?._id);
  authService.clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Signed out' } });
}

export async function me(req, res) {
  res.json({ success: true, data: { user: req.user.toPublicJSON() } });
}

export async function forgotPassword(req, res) {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json({
    success: true,
    data: {
      message: 'If an account exists for that email, a password reset link has been sent.',
      ...devHint(result.resetUrl ? { devResetUrl: result.resetUrl } : {}),
    },
  });
}

export async function resetPassword(req, res) {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, data: { message: 'Password updated. Please sign in.' } });
}

export async function updateProfile(req, res) {
  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({ success: true, data: { user: user.toPublicJSON() } });
}

export const cookieName = ACCESS_COOKIE;

export default {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
  updateProfile,
};
