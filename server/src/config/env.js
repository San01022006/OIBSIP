import crypto from 'node:crypto';
import 'dotenv/config';
import { z } from 'zod';

const bool = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : /^(1|true|yes|on)$/i.test(v)));

const int = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number.parseInt(v, 10)))
    .pipe(z.number().int());

const num = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number.parseFloat(v)))
    .pipe(z.number());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: int(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().optional(),
  COOKIE_SECURE: bool(false),
  EMAIL_TOKEN_TTL_MINUTES: int(60),
  RESET_TOKEN_TTL_MINUTES: int(30),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: int(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Crust & Craft <no-reply@crustandcraft.test>'),
  ADMIN_NAME: z.string().default('Crust & Craft Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@crustandcraft.test'),
  ADMIN_PASSWORD: z.string().default('ChangeMe_Str0ng!Pass'),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  PIZZA_BASE_PRICE: num(99),
  DELIVERY_FEE: num(40),
  FREE_DELIVERY_THRESHOLD: num(499),
  TAX_RATE: num(0.05),
  INVENTORY_CRON: z.string().default('*/5 * * * *'),
  ENABLE_INVENTORY_SCHEDULER: bool(true),
  ENABLE_MOCK_PAYMENTS: bool(false),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('\n[env] Invalid environment configuration:\n');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  // eslint-disable-next-line no-console
  console.error('\nCopy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === 'production';
const isTest = raw.NODE_ENV === 'test';

const devFallback = (name) => {
  // eslint-disable-next-line no-console
  console.warn(
    `[env] ${name} was not set — generating an insecure development-only value. ` +
      'Set it in .env before deploying.'
  );
  return crypto.randomBytes(48).toString('hex');
};

const jwtSecret = raw.JWT_SECRET || (isProd ? null : devFallback('JWT_SECRET'));
const cookieSecret = raw.COOKIE_SECRET || (isProd ? null : devFallback('COOKIE_SECRET'));

if (isProd && (!jwtSecret || jwtSecret.length < 32)) {
  // eslint-disable-next-line no-console
  console.error('[env] JWT_SECRET must be set to at least 32 characters in production.');
  process.exit(1);
}
if (isProd && (!cookieSecret || cookieSecret.length < 32)) {
  // eslint-disable-next-line no-console
  console.error('[env] COOKIE_SECRET must be set to at least 32 characters in production.');
  process.exit(1);
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProd,
  isTest,
  isDev: raw.NODE_ENV === 'development',
  port: raw.PORT,
  clientUrls: raw.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean),
  mongoUri: raw.MONGODB_URI,
  jwtSecret,
  jwtExpiresIn: raw.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: raw.REFRESH_TOKEN_EXPIRES_IN,
  cookieSecret,
  cookieSecure: raw.COOKIE_SECURE || isProd,
  emailTokenTtlMinutes: raw.EMAIL_TOKEN_TTL_MINUTES,
  resetTokenTtlMinutes: raw.RESET_TOKEN_TTL_MINUTES,
  smtp: {
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
    secure: raw.SMTP_SECURE,
    user: raw.SMTP_USER,
    pass: raw.SMTP_PASS,
  },
  mailFrom: raw.MAIL_FROM,
  admin: {
    name: raw.ADMIN_NAME,
    email: raw.ADMIN_EMAIL,
    password: raw.ADMIN_PASSWORD,
  },
  razorpay: {
    keyId: raw.RAZORPAY_KEY_ID,
    keySecret: raw.RAZORPAY_KEY_SECRET,
    webhookSecret: raw.RAZORPAY_WEBHOOK_SECRET,
    configured: Boolean(raw.RAZORPAY_KEY_ID && raw.RAZORPAY_KEY_SECRET),
  },
  pricing: {
    basePrice: raw.PIZZA_BASE_PRICE,
    deliveryFee: raw.DELIVERY_FEE,
    freeDeliveryThreshold: raw.FREE_DELIVERY_THRESHOLD,
    taxRate: raw.TAX_RATE,
  },
  inventory: {
    cron: raw.INVENTORY_CRON,
    enabled: raw.ENABLE_INVENTORY_SCHEDULER && !isTest,
  },
  enableMockPayments: raw.ENABLE_MOCK_PAYMENTS && !isProd,
};
