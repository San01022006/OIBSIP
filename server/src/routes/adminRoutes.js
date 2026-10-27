import { Router } from 'express';
import * as rawCtrl from '../controllers/adminController.js';
import { wrapControllers } from '../utils/controller.js';
import { validate } from '../middleware/validate.js';
import { authenticateAdmin } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { authLimiter, loginLimiter } from '../middleware/rateLimit.js';
import { loginSchema } from '../validators/authValidators.js';
import {
  listOrdersQuery,
  updateStatusSchema,
  updateInventorySchema,
  listInventoryQuery,
  listMovementsQuery,
  orderIdParams,
  ingredientIdParams,
} from '../validators/adminValidators.js';
import { ROLES } from '../config/constants.js';

const router = Router();
const ctrl = wrapControllers(rawCtrl);

// ── Public admin auth ──────────────────────────────────────────────
router.post('/auth/login', loginLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/auth/refresh', authLimiter, ctrl.refresh);

// ── Everything below requires an authenticated admin ───────────────
router.use(authenticateAdmin, authorize(ROLES.ADMIN));

router.post('/auth/logout', ctrl.logout);
router.get('/auth/me', ctrl.me);
router.get('/dashboard', ctrl.dashboard);
router.get('/orders', validate({ query: listOrdersQuery }), ctrl.listOrders);
router.get('/orders/:id', validate({ params: orderIdParams }), ctrl.getOrder);
router.patch('/orders/:id/status', validate({ params: orderIdParams, body: updateStatusSchema }), ctrl.updateOrderStatus);
router.get('/inventory', validate({ query: listInventoryQuery }), ctrl.listInventory);
router.get('/inventory/movements', validate({ query: listMovementsQuery }), ctrl.listMovements);
router.patch('/inventory/:id', validate({ params: ingredientIdParams, body: updateInventorySchema }), ctrl.updateInventory);
router.post('/inventory/check-alerts', ctrl.inventoryAlerts);
router.get('/notifications', ctrl.notificationLogs);
router.get('/customers', ctrl.listCustomers);

export default router;
