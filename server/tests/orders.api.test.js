import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, clear, cookieValue } from './helpers/db.js';
import { createApp } from '../src/app.js';
import { seedMenu } from '../src/scripts/seedMenu.js';
import { User } from '../src/models/User.js';
import { Ingredient } from '../src/models/Ingredient.js';
import { Order } from '../src/models/Order.js';

const PASSWORD = 'Str0ngPass1';
const EMAIL = 'orderer@example.com';

let app;
let agent;
let csrf;

async function createVerifiedUser() {
  const user = new User({
    name: 'Test Orderer',
    email: EMAIL,
    phone: '9999999999',
    role: 'customer',
    emailVerified: true,
  });
  await user.setPassword(PASSWORD);
  await user.save();
  return user;
}

const pickIngredient = (category) =>
  Ingredient.findOne({ category, stock: { $gt: 0 }, available: true });

const deliveryAddress = {
  name: 'Test Orderer',
  phone: '9999999999',
  address: '123 Test Street',
  city: 'Mumbai',
  postalCode: '400001',
};

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clear();
  await seedMenu({ preserveStock: false });
  await createVerifiedUser();

  agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  expect(login.status).toBe(200);
  csrf = cookieValue(login, 'cc_csrf');
  expect(csrf).toBeTruthy();
});

async function buildConfiguration(quantity = 2) {
  const [base, sauce, cheese, veg] = await Promise.all([
    pickIngredient('base'),
    pickIngredient('sauce'),
    pickIngredient('cheese'),
    pickIngredient('vegetable'),
  ]);
  return {
    item: {
      quantity,
      configuration: {
        base: { ingredient: String(base._id) },
        sauce: { ingredient: String(sauce._id) },
        cheese: { ingredient: String(cheese._id) },
        vegetables: [{ ingredient: String(veg._id) }],
      },
    },
    _refs: { base, cheese },
  };
}

describe('order and payment API', () => {
  it('runs preview → create → mock payment → inventory commit without double deduction', async () => {
    const { item, _refs } = await buildConfiguration(2);
    const items = [item];
    const startBase = _refs.base.stock;

    const preview = await agent
      .post('/api/orders/preview')
      .set('x-csrf-token', csrf)
      .send({ items });
    expect(preview.status).toBe(200);
    expect(preview.body.data.availability.ok).toBe(true);
    expect(preview.body.data.items[0].quantity).toBe(2);
    expect(preview.body.data.pricing.total).toBeGreaterThan(0);

    const created = await agent
      .post('/api/orders')
      .set('x-csrf-token', csrf)
      .send({ items, delivery: deliveryAddress });
    expect(created.status).toBe(201);
    const order = created.body.data.order;
    expect(order.paymentStatus).toBe('pending');
    expect(order.status).toBe('payment_pending');

    // Stock is reserved at order creation.
    const afterReserve = await Ingredient.findById(_refs.base._id).lean();
    expect(afterReserve.stock).toBe(startBase - 2);

    const session = await agent
      .post('/api/payments/create-order')
      .set('x-csrf-token', csrf)
      .send({ orderId: order._id });
    expect(session.status).toBe(200);
    expect(session.body.data.mock).toBe(true);
    expect(session.body.data.mockToken).toBeTruthy();

    const verified = await agent
      .post('/api/payments/verify-mock')
      .set('x-csrf-token', csrf)
      .send({ orderId: order._id, token: session.body.data.mockToken });
    expect(verified.status).toBe(200);
    expect(verified.body.data.duplicate).toBe(false);
    expect(verified.body.data.order.paymentStatus).toBe('paid');
    expect(verified.body.data.order.status).toBe('order_received');

    // Reservation was consumed (flag flipped) but stock not deducted twice.
    const afterPay = await Ingredient.findById(_refs.base._id).lean();
    expect(afterPay.stock).toBe(startBase - 2);

    // Re-verifying the same payment is idempotent and never deducts again.
    const duplicate = await agent
      .post('/api/payments/verify-mock')
      .set('x-csrf-token', csrf)
      .send({ orderId: order._id, token: session.body.data.mockToken });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.duplicate).toBe(true);

    const afterDuplicate = await Ingredient.findById(_refs.base._id).lean();
    expect(afterDuplicate.stock).toBe(startBase - 2);
  });

  it('rejects an order when a required ingredient is out of stock', async () => {
    const { item, _refs } = await buildConfiguration(1);
    await Ingredient.updateOne({ _id: _refs.cheese._id }, { $set: { stock: 0 } });

    const res = await agent
      .post('/api/orders')
      .set('x-csrf-token', csrf)
      .send({ items: [item], delivery: deliveryAddress });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('restores reserved stock when a pending order is cancelled', async () => {
    const { item, _refs } = await buildConfiguration(3);
    const startBase = _refs.base.stock;

    const created = await agent
      .post('/api/orders')
      .set('x-csrf-token', csrf)
      .send({ items: [item], delivery: deliveryAddress });
    expect(created.status).toBe(201);
    const order = created.body.data.order;

    expect((await Ingredient.findById(_refs.base._id).lean()).stock).toBe(startBase - 3);

    const cancelled = await agent
      .post(`/api/orders/${order._id}/cancel`)
      .set('x-csrf-token', csrf)
      .send({ reason: 'Changed my mind' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order.status).toBe('cancelled');

    expect((await Ingredient.findById(_refs.base._id).lean()).stock).toBe(startBase);
  });

  it('requires authentication for order endpoints', async () => {
    const res = await request(app).get('/api/orders/my');
    expect(res.status).toBe(401);
  });
});
