import { Router } from 'express';
import * as rawCtrl from '../controllers/orderController.js';
import { wrapControllers } from '../utils/controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireVerifiedEmail } from '../middleware/authorize.js';
import { previewOrderSchema, createOrderSchema, cancelOrderSchema } from '../validators/orderValidators.js';

const router = Router();
const ctrl = wrapControllers(rawCtrl);

router.post('/preview', authenticate, validate({ body: previewOrderSchema }), ctrl.previewOrder);
router.post('/', authenticate, requireVerifiedEmail, validate({ body: createOrderSchema }), ctrl.createOrder);
router.get('/my', authenticate, ctrl.myOrders);
router.get('/:id', authenticate, ctrl.getOrder);
router.post('/:id/cancel', authenticate, validate({ body: cancelOrderSchema }), ctrl.cancelOrder);

export default router;
