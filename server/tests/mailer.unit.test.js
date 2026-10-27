import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { sendMail, verifyMailer, isRealMailerConfigured } from '../src/utils/mailer.js';

const message = {
  to: 'customer@example.com',
  subject: 'Verify your Crust & Craft account',
  text: 'Open http://localhost:5173/verify-email?token=abc123',
  html: '<a href="http://localhost:5173/verify-email?token=abc123">Verify</a>',
};

const fakeTransport = (overrides = {}) => ({
  sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
  verify: vi.fn().mockResolvedValue(true),
  ...overrides,
});

let originalHost;
let originalUser;
let originalPass;

beforeEach(() => {
  originalHost = env.smtp.host;
  originalUser = env.smtp.user;
  originalPass = env.smtp.pass;
});

afterEach(() => {
  env.smtp.host = originalHost;
  env.smtp.user = originalUser;
  env.smtp.pass = originalPass;
});

describe('isRealMailerConfigured', () => {
  it('is false when SMTP_HOST is empty and true when set', () => {
    env.smtp.host = '';
    expect(isRealMailerConfigured()).toBe(false);
    env.smtp.host = 'smtp.example.com';
    expect(isRealMailerConfigured()).toBe(true);
  });
});

describe('sendMail', () => {
  it('reports delivered:true with the message id on a real SMTP success', async () => {
    env.smtp.host = 'smtp.example.com';
    const transport = fakeTransport();

    const result = await sendMail(message, { transport });

    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: message.to, subject: message.subject })
    );
    expect(result.delivered).toBe(true);
    expect(result.messageId).toBe('msg-1');
  });

  it('reports delivered:false and does not throw when the transport fails', async () => {
    env.smtp.host = 'smtp.example.com';
    const transport = fakeTransport({
      sendMail: vi.fn().mockRejectedValue(new Error('550 relay denied')),
    });

    const result = await sendMail(message, { transport });

    expect(result.delivered).toBe(false);
    expect(result.error).toContain('550 relay denied');
  });

  it('does not deliver through the console transport when SMTP is unconfigured', async () => {
    env.smtp.host = '';
    const transport = fakeTransport();

    const result = await sendMail(message, { transport });

    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    expect(result.delivered).toBe(false);
    expect(result.preview).toBe(message.text);
  });

  it('never leaks SMTP credentials in a failure message', async () => {
    env.smtp.host = 'smtp.example.com';
    env.smtp.user = 'mailer@example.com';
    env.smtp.pass = 'SuperSecretAppPassword';
    const transport = fakeTransport({
      sendMail: vi
        .fn()
        .mockRejectedValue(
          new Error('Invalid login for mailer@example.com using SuperSecretAppPassword')
        ),
    });

    const result = await sendMail(message, { transport });

    expect(result.delivered).toBe(false);
    expect(result.error).not.toContain('SuperSecretAppPassword');
    expect(result.error).not.toContain('mailer@example.com');
  });
});

describe('verifyMailer', () => {
  it('reports not-configured without attempting a connection', async () => {
    env.smtp.host = '';
    const transport = fakeTransport();

    const result = await verifyMailer({ transport });

    expect(result).toEqual(expect.objectContaining({ configured: false, ok: false }));
    expect(transport.verify).not.toHaveBeenCalled();
  });

  it('reports ok:true when verification succeeds', async () => {
    env.smtp.host = 'smtp.example.com';
    const transport = fakeTransport();

    const result = await verifyMailer({ transport });

    expect(transport.verify).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ configured: true, ok: true });
  });

  it('reports a sanitized ok:false when verification fails', async () => {
    env.smtp.host = 'smtp.example.com';
    env.smtp.pass = 'SuperSecretAppPassword';
    const transport = fakeTransport({
      verify: vi.fn().mockRejectedValue(new Error('535 auth failed SuperSecretAppPassword')),
    });

    const result = await verifyMailer({ transport });

    expect(result.configured).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain('SuperSecretAppPassword');
  });
});
