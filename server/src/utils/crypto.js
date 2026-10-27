import crypto from 'node:crypto';

/** Cryptographically secure random token (returned to the user). */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** SHA-256 digest used to store tokens at rest. */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

/** Constant-time comparison for signatures/secrets. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** HMAC-SHA256 hex digest. */
export function hmacSha256(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export default { generateToken, hashToken, safeEqual, hmacSha256 };
