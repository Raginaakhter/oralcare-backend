import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  verifyEmail,
  resendVerificationEmail,
} from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth';
import {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  emailVerificationLimiter,
} from '../middlewares/rateLimit';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../schemas/auth.schemas';

const router = Router();

router.post('/register', registerLimiter, validateBody(registerSchema), register);
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.post(
  '/verify-email',
  emailVerificationLimiter,
  validateBody(verifyEmailSchema),
  verifyEmail
);
router.post(
  '/resend-verification',
  emailVerificationLimiter,
  validateBody(resendVerificationSchema),
  resendVerificationEmail
);

export default router;
