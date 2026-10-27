import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/utils/mailer.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sendMail: vi.fn() };
});

import { connect, disconnect, clear } from './helpers/db.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Token } from '../src/models/Token.js';
import { hashToken } from '../src/utils/crypto.js';
import { sendMail } from '../src/utils/mailer.js';

let app;

const payload = (overrides = {}) => ({
  name: 'Mail Tester',
  email: 'mail.tester@example.com',
  phone: '9876500011',
  password: 'Str0ngPass1',
  confirmPassword: 'Str0ngPass1',
  ...overrides,
});

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clear();
  sendMail.mockReset();
  sendMail.mockResolvedValue({ delivered: true, messageId: 'test-message' });
});

describe('registration email delivery', () => {
  it('invokes the mailer exactly once per registration', async () => {
    const res = await request(app).post('/api/auth/register').send(payload());

    expect(res.status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('mail.tester@example.com');
    expect(message.subject).toMatch(/verify/i);
    expect(message.text).toContain('/verify-email?token=');
  });

  it('builds the verification link from CLIENT_URL and the /verify-email route', async () => {
    const res = await request(app).post('/api/auth/register').send(payload());

    expect(res.status).toBe(201);
    expect(res.body.data.devVerificationUrl).toMatch(
      /^http:\/\/localhost:5173\/verify-email\?token=[0-9a-f]{64}$/
    );
  });

  it('stores only a hashed, expiring token — never the raw link token', async () => {
    const res = await request(app).post('/api/auth/register').send(payload());
    const raw = new URL(res.body.data.devVerificationUrl).searchParams.get('token');

    const stored = await Token.findOne({ purpose: 'email_verify' });
    expect(stored).toBeTruthy();
    expect(stored.tokenHash).toBe(hashToken(raw));
    expect(stored.tokenHash).not.toBe(raw);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('sends one email per request when re-registering an unverified email', async () => {
    await request(app).post('/api/auth/register').send(payload());
    expect(sendMail).toHaveBeenCalledTimes(1);

    const second = await request(app).post('/api/auth/register').send(payload());
    expect(second.status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(await Token.countDocuments({ purpose: 'email_verify' })).toBe(1);
  });

  it('reports emailDelivered:true when the mailer succeeds', async () => {
    const res = await request(app).post('/api/auth/register').send(payload());

    expect(res.body.data.emailDelivered).toBe(true);
    expect(res.body.data.message).toMatch(/verification email has been sent/i);
  });

  it('reports emailDelivered:false but keeps the account unverified when delivery fails', async () => {
    sendMail.mockResolvedValueOnce({ delivered: false, error: 'smtp unavailable' });

    const res = await request(app).post('/api/auth/register').send(payload());

    expect(res.status).toBe(201);
    expect(res.body.data.emailDelivered).toBe(false);
    expect(res.body.data.message).toMatch(/could not send the verification email/i);

    const user = await User.findOne({ email: 'mail.tester@example.com' });
    expect(user.emailVerified).toBe(false);
    expect(await Token.countDocuments({ purpose: 'email_verify' })).toBe(1);
  });

  it('does not expose the raw token in the response when a real mailer is in use', async () => {
    const { env } = await import('../src/config/env.js');
    const previousHost = env.smtp.host;
    env.smtp.host = 'smtp.example.com';
    try {
      const res = await request(app).post('/api/auth/register').send(payload());
      expect(res.status).toBe(201);
      expect(res.body.data.devVerificationUrl).toBeUndefined();
    } finally {
      env.smtp.host = previousHost;
    }
  });
});
