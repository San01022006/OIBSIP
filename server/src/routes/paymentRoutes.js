import { Router } from 'express';
import * as rawCtrl from '../controllers/paymentController.js';
import { wrapControllers } from '../utils/controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import {
  createOrderPaymentSchema,
  verifyPaymentSchema,
  failedPaymentSchema,
  mockPaymentSchema,
} from '../validators/paymentValidators.js';

const router = Router();
const ctrl = wrapControllers(rawCtrl);

// Webhook: no user auth — verified by Razorpay signature. Raw body is used.
router.post('/webhook', ctrl.webhook);

router.use(authenticate, paymentLimiter);
router.post('/create-order', validate({ body: createOrderPaymentSchema }), ctrl.createOrder);
router.post('/verify', validate({ body: verifyPaymentSchema }), ctrl.verify);
router.post('/verify-mock', validate({ body: mockPaymentSchema }), ctrl.verifyMock);
router.post('/failed', validate({ body: failedPaymentSchema }), ctrl.failed);

export default router;
