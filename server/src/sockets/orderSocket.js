import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { ROLES } from '../config/constants.js';
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from '../middleware/authenticate.js';
import { logger } from '../utils/logger.js';

let io = null;

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

function extractSocketToken(socket) {
  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[ACCESS_COOKIE]) return cookies[ACCESS_COOKIE];
    if (cookies[ADMIN_ACCESS_COOKIE]) return cookies[ADMIN_ACCESS_COOKIE];
  }
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;
  const header = socket.handshake.headers?.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const userRoom = (id) => `user:${id}`;
const orderRoom = (id) => `order:${id}`;
export const ADMIN_ROOM = 'admins';

export function initOrderSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls, credentials: true },
    path: '/socket.io',
  });

  // Authenticate every socket connection.
  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
      if (payload.typ && payload.typ !== 'access') return next(new Error('unauthorized'));
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = { id: String(user._id), role: user.role, name: user.name };
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;
    socket.join(userRoom(id));
    if (role === ROLES.ADMIN) socket.join(ADMIN_ROOM);
    logger.debug(`[socket] connected user=${id} role=${role}`);

    // Customers may only join rooms for their own orders; admins may join any.
    socket.on('join:order', async (orderId, ack) => {
      try {
        const order = await Order.findById(orderId).select('user').lean();
        if (!order) throw new Error('not_found');
        if (role !== ROLES.ADMIN && String(order.user) !== id) throw new Error('forbidden');
        socket.join(orderRoom(orderId));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('leave:order', (orderId) => socket.leave(orderRoom(orderId)));
    socket.on('disconnect', () => logger.debug(`[socket] disconnected user=${id}`));
  });

  return io;
}

/** Broadcast an order update to its owner, the order room and all admins. */
export function emitOrderUpdate(order, extra = {}) {
  if (!io || !order) return;
  const payload = {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt,
    ...extra,
  };
  io.to(userRoom(String(order.user))).emit('order:updated', payload);
  io.to(orderRoom(String(order._id))).emit('order:updated', payload);
  io.to(ADMIN_ROOM).emit('order:updated', payload);
}

export function getIo() {
  return io;
}

export default { initOrderSocket, emitOrderUpdate, getIo, ADMIN_ROOM };
