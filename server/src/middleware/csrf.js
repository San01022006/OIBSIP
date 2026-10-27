import { env } from '../config/env.js';
import { TOKEN_PURPOSE } from '../config/constants.js';
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from './authenticate.js';

export const CSRF_COOKIE = 'cc_csrf';
export const CSRF_HEADER = 'x-csrf-token';

function randomToken() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
}

const cookieBase = () => ({
  httpOnly: false,
  sameSite: 'lax',
  secure: env.cookieSecure,
  path: '/',
});

/** Ensure a readable CSRF cookie exists so the client can echo it back. */
export const ensureCsrfCookie = (req, res, next) => {
  if (!req.cookies?.[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, randomToken(), { ...cookieBase(), maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
  next();
};

/**
 * Double-submit CSRF protection for cookie-authenticated mutating requests.
 * Bearer-token requests (no auth cookie) are exempt.
 */
export const verifyCsrf = (req, res, next) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating) return next();

  const usesCookieAuth = Boolean(req.cookies?.[ACCESS_COOKIE] || req.cookies?.[ADMIN_ACCESS_COOKIE]);
  if (!usesCookieAuth) return next();

  const header = req.get(CSRF_HEADER);
  const cookie = req.cookies?.[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) {
    const err = new Error('Invalid or missing CSRF token');
    err.statusCode = 403;
    return next(err);
  }
  return next();
};

export default { ensureCsrfCookie, verifyCsrf };
