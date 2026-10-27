/* Minimal structured logger that never prints secrets. */

const REDACT_KEYS = [
  'password',
  'passwordhash',
  'passwordHash',
  'token',
  'accesstoken',
  'accessToken',
  'refreshtoken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
  'keysecret',
  'razorpay_key_secret',
  'razorpayKeySecret',
  'signature',
];

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? 2 : 3);

function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEYS.includes(k.toLowerCase().replace(/[_-]/g, ''))) {
        out[k] = '[redacted]';
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function emit(level, args) {
  if (LEVELS[level] > currentLevel) return;
  const stamp = new Date().toISOString();
  const cleaned = args.map((a) => (typeof a === 'object' ? redact(a) : a));
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)(`[${stamp}] [${level.toUpperCase()}]`, ...cleaned);
}

export const logger = {
  error: (...args) => emit('error', args),
  warn: (...args) => emit('warn', args),
  info: (...args) => emit('info', args),
  debug: (...args) => emit('debug', args),
};

export default logger;
