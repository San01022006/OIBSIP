import { asyncHandler } from './asyncHandler.js';

/**
 * Wrap every function of a controller namespace so that rejected promises are
 * forwarded to the Express error middleware. Express 4 does not do this
 * automatically, which would otherwise leave thrown ApiErrors hanging.
 */
export function wrapControllers(controllers) {
  const wrapped = {};
  for (const [key, value] of Object.entries(controllers)) {
    wrapped[key] = typeof value === 'function' ? asyncHandler(value) : value;
  }
  return wrapped;
}

export default wrapControllers;
