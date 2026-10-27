import { Router } from 'express';
import authRoutes from './authRoutes.js';
import menuRoutes from './menuRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';
import { isRazorpayConfigured } from '../services/paymentService.js';
import { env } from '../config/env.js';
import { isRealMailerConfigured } from '../utils/mailer.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      integrations: {
        razorpay: isRazorpayConfigured() ? 'configured' : 'not_configured',
        mockPayments: env.enableMockPayments ? 'enabled' : 'disabled',
        mailer: isRealMailerConfigured() ? 'smtp' : 'console (development)',
      },
    },
  });
});

router.get('/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      brand: { name: 'Crust & Craft', currency: 'INR' },
      pricing: {
        basePrice: env.pricing.basePrice,
        deliveryFee: env.pricing.deliveryFee,
        freeDeliveryThreshold: env.pricing.freeDeliveryThreshold,
        taxRate: env.pricing.taxRate,
      },
      payments: {
        razorpayConfigured: isRazorpayConfigured(),
        razorpayKeyId: isRazorpayConfigured() ? env.razorpay.keyId : null,
        mockEnabled: env.enableMockPayments,
      },
    },
  });
});

router.use('/auth', authRoutes);
router.use('/', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

export default router;
