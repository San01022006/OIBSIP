import { logger } from '../utils/logger.js';

/**
 * Request logger that records method, path, status and duration only.
 * Bodies, cookies and authorization headers are never logged.
 */
export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
  });
  next();
};

export default requestLogger;
