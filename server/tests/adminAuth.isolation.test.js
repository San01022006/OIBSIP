import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, clear, cookieValue } from './helpers/db.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const PASSWORD = 'Str0ngPass1';
const ADMIN_EMAIL = 'admin@test.local';
const CUSTOMER_EMAIL = 'customer@test.local';

let app;

async function makeUsers() {
  const admin = new User({ name: 'Admin', email: ADMIN_EMAIL, role: 'admin', emailVerified: true });
  await admin.setPassword(PASSWORD);
  await admin.save();

  const customer = new User({
    name: 'Customer',
    email: CUSTOMER_EMAIL,
    phone: '9876543210',
    role: 'customer',
    emailVerified: true,
  });
  await customer.setPassword(PASSWORD);
  await customer.save();
}

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clear();
  await makeUsers();
});

describe('admin session isolation', () => {
  it('issues an admin-scoped cookie and never a storefront access cookie', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(cookieValue(res, 'cc_admin_access')).toBeTruthy();
    expect(cookieValue(res, 'cc_admin_refresh')).toBeTruthy();
    expect(cookieValue(res, 'cc_access')).toBeNull();
  });

  it('never lets a customer session authenticate an admin endpoint', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);

    // The customer cookie is invisible to the admin namespace, so admin routes
    // treat it as unauthenticated rather than leaking it through to `authorize`.
    for (const path of ['/api/admin/dashboard', '/api/admin/orders', '/api/admin/inventory']) {
      const res = await agent.get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication required');
    }
  });

  it('lets an admin console session coexist with a customer session without shadowing', async () => {
    const agent = request.agent(app);
    const custLogin = await agent
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    const csrf = cookieValue(custLogin, 'cc_csrf');

    const adminLogin = await agent
      .post('/api/admin/auth/login')
      .set('x-csrf-token', csrf)
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(adminLogin.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.role).toBe('customer');

    for (const path of ['/api/admin/dashboard', '/api/admin/orders', '/api/admin/inventory']) {
      const res = await agent.get(path);
      expect(res.status).toBe(200);
    }
    const adminMe = await agent.get('/api/admin/auth/me');
    expect(adminMe.body.data.user.role).toBe('admin');
  });

  it('requires authentication for admin endpoints', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('refreshes an admin session via the admin-scoped endpoint', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    const csrf = cookieValue(login, 'cc_csrf');

    const refreshed = await agent.post('/api/admin/auth/refresh').set('x-csrf-token', csrf);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.user.role).toBe('admin');

    const dash = await agent.get('/api/admin/dashboard');
    expect(dash.status).toBe(200);
  });

  it('rejects an admin refresh without a refresh cookie', async () => {
    const res = await request(app).post('/api/admin/auth/refresh');
    expect(res.status).toBe(401);
  });
});
