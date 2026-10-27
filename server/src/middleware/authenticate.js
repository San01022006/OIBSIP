import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const ACCESS_COOKIE = 'cc_access';
// Admin console sessions live in a separate cookie namespace so they can never
// be shadowed by (or clobber) a storefront/customer session in the same browser.
export const ADMIN_ACCESS_COOKIE = 'cc_admin_access';

function extractToken(req, cookieNames) {
  for (const name of cookieNames) {
    if (req.cookies?.[name]) return req.cookies[name];
  }
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function makeAuthenticate(cookieNames) {
  return async (req, _res, next) => {
    try {
      const token = extractToken(req, cookieNames);
      if (!token) throw ApiError.unauthorized('Authentication required');

      let payload;
      try {
        payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
      } catch {
        throw ApiError.unauthorized('Session expired or invalid');
      }

      const user = await User.findById(payload.sub);
      if (!user) throw ApiError.unauthorized('Account no longer exists');
      if (user.isLocked()) throw ApiError.forbidden('Account temporarily locked');

      req.user = user;
      req.auth = { tokenId: payload.jti, role: user.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Require a valid access token and load the user onto req.user.
 * Accepts a customer session first, then an admin session, so an admin can
 * still browse the storefront while the two sessions live side by side.
 */
export const authenticate = makeAuthenticate([ACCESS_COOKIE, ADMIN_ACCESS_COOKIE]);

/**
 * Admin-only authentication. Reads ONLY the admin cookie namespace, so a
 * customer session can never authenticate an admin-console request.
 */
export const authenticateAdmin = makeAuthenticate([ADMIN_ACCESS_COOKIE]);

/** Optionally attach req.user when a valid token is present, otherwise continue. */
export const optionalAuthenticate = async (req, _res, next) => {
  const token = extractToken(req, [ACCESS_COOKIE, ADMIN_ACCESS_COOKIE]);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub);
    if (user && !user.isLocked()) req.user = user;
  } catch {
    /* ignore invalid optional token */
  }
  return next();
};

export default authenticate;
