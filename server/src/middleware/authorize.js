import ApiError from '../utils/ApiError.js';

/**
 * Role based authorization. Must run after `authenticate`.
 * Treats a missing/incorrect role as forbidden; never trust the client.
 */
export const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Authentication required'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  return next();
};

export const requireVerifiedEmail = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Authentication required'));
  if (!req.user.emailVerified) {
    return next(new ApiError(403, 'Please verify your email address before continuing'));
  }
  return next();
};

export default authorize;
