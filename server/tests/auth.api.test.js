import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, clear } from './helpers/db.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

let app;

/**
 * The exact payload the client registration form builds
 * (see client/src/pages/Register.jsx). Keeping this in one place makes the
 * frontend/backend compatibility contract explicit.
 */
const clientRegisterPayload = (overrides = {}) => ({
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  password: 'Str0ngPass1',
  confirmPassword: 'Str0ngPass1',
  ...overrides,
});

const postRegister = (payload) => request(app).post('/api/auth/register').send(payload);

const fieldsOf = (res) => (res.body?.error?.details || []).map((d) => d.field);

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clear();
});

describe('POST /api/auth/register', () => {
  it('accepts the exact payload sent by the client registration form', async () => {
    const payload = clientRegisterPayload();
    const res = await postRegister(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '9876543210',
      emailVerified: false,
    });
  });

  it('creates exactly one user, hashes the password and never echoes secrets', async () => {
    const res = await postRegister(clientRegisterPayload());
    expect(res.status).toBe(201);

    const user = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash');
    expect(user).toBeTruthy();
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toBe('Str0ngPass1');
    await expect(user.verifyPassword('Str0ngPass1')).resolves.toBe(true);
    expect(user.phone).toBe('9876543210');

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('Str0ngPass1');
    expect(serialized).not.toContain('confirmPassword');
  });

  it('normalises the email (trim + lowercase)', async () => {
    const res = await postRegister(
      clientRegisterPayload({ email: '  ASHA@Example.COM  ' })
    );
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('asha@example.com');
  });

  it('rejects a missing confirmPassword with a field-specific message', async () => {
    const payload = clientRegisterPayload();
    delete payload.confirmPassword;

    const res = await postRegister(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(fieldsOf(res)).toContain('confirmPassword');
  });

  it('rejects a password/confirmPassword mismatch', async () => {
    const res = await postRegister(
      clientRegisterPayload({ confirmPassword: 'Different1' })
    );
    expect(res.status).toBe(400);
    const detail = (res.body.error.details || []).find((d) => d.field === 'confirmPassword');
    expect(detail?.message).toBe('Passwords do not match');
  });

  it('rejects an invalid email', async () => {
    const res = await postRegister(clientRegisterPayload({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('email');
  });

  it('rejects a weak password', async () => {
    const res = await postRegister(
      clientRegisterPayload({ password: 'short', confirmPassword: 'short' })
    );
    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('password');
  });

  it('rejects a password without a number', async () => {
    const res = await postRegister(
      clientRegisterPayload({ password: 'NoNumbersHere', confirmPassword: 'NoNumbersHere' })
    );
    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('password');
  });

  it('rejects an invalid phone number', async () => {
    const res = await postRegister(clientRegisterPayload({ phone: '12345' }));
    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('phone');
  });

  it('rejects a missing phone number', async () => {
    const payload = clientRegisterPayload();
    delete payload.phone;
    const res = await postRegister(payload);
    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('phone');
  });

  it('returns 409 for an already verified email', async () => {
    const verified = new User({
      name: 'Existing',
      email: 'asha@example.com',
      phone: '9876543210',
      role: 'customer',
      emailVerified: true,
    });
    await verified.setPassword('Str0ngPass1');
    await verified.save();

    const res = await postRegister(clientRegisterPayload());
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/i);
    expect(await User.countDocuments({ email: 'asha@example.com' })).toBe(1);
  });

  it('re-registering an unverified email resends verification instead of duplicating', async () => {
    const first = await postRegister(clientRegisterPayload());
    expect(first.status).toBe(201);

    const second = await postRegister(clientRegisterPayload());
    expect(second.status).toBe(201);
    expect(second.body.data.message).toMatch(/already exists but is unverified/i);
    expect(await User.countDocuments({ email: 'asha@example.com' })).toBe(1);
  });

  it('backfills phone for a previously unverified account that lacks one', async () => {
    const existing = new User({
      name: 'Asha',
      email: 'asha@example.com',
      role: 'customer',
      emailVerified: false,
    });
    await existing.setPassword('Str0ngPass1');
    await existing.save();

    const res = await postRegister(clientRegisterPayload({ phone: '9000000001' }));
    expect(res.status).toBe(201);

    const user = await User.findOne({ email: 'asha@example.com' });
    expect(user.phone).toBe('9000000001');
  });
});
