import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { initOrderSocket } from './sockets/orderSocket.js';
import { startInventoryMonitor, stopInventoryMonitor } from './jobs/inventoryMonitor.js';
import { logger } from './utils/logger.js';

async function start() {
  const app = createApp();
  const server = http.createServer(app);

  initOrderSocket(server);

  try {
    await connectDatabase();
  } catch (err) {
    logger.error(`[server] Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  startInventoryMonitor();

  await new Promise((resolve) => server.listen(env.port, resolve));
  logger.info(`[server] Crust & Craft API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  logger.info(`[server] Health check: http://localhost:${env.port}/api/health`);
  if (!env.razorpay.configured) {
    logger.warn('[server] Razorpay keys not set — online payments are disabled.');
  }

  const shutdown = async (signal) => {
    logger.info(`[server] ${signal} received — shutting down gracefully`);
    stopInventoryMonitor();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('[server] Unhandled rejection:', reason));
  process.on('uncaughtException', (err) => {
    logger.error('[server] Uncaught exception:', err.message);
    shutdown('uncaughtException');
  });
}

start();
