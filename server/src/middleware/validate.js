import { ZodError } from 'zod';
import ApiError from '../utils/ApiError.js';

const formatZodIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

/**
 * Validate request parts against Zod schemas.
 * On success the parsed (and coerced) values replace the originals.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    if (schemas.query) req.query = schemas.query.parse(req.query ?? {});
    if (schemas.params) req.params = schemas.params.parse(req.params ?? {});
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      return next(ApiError.badRequest('Validation failed', formatZodIssues(err)));
    }
    return next(err);
  }
};

export default validate;
