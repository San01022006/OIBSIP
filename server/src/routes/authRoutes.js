import { Router } from 'express';
import * as rawCtrl from '../controllers/authController.js';
import { wrapControllers } from '../utils/controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter, emailLimiter, loginLimiter } from '../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';

const router = Router();
const ctrl = wrapControllers(rawCtrl);

router.post('/register', emailLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), ctrl.verifyEmail);
router.post('/resend-verification', emailLimiter, validate({ body: resendVerificationSchema }), ctrl.resendVerification);
router.post('/login', loginLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/refresh', authLimiter, ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), ctrl.updateProfile);
router.post('/forgot-password', emailLimiter, validate({ body: forgotPasswordSchema }), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), ctrl.resetPassword);

export default router;
