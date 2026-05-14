import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as authController from './auth.controller';
import { loginSchema, registerSchema } from './auth.validators';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  validateBody(registerSchema),
  authController.register
);
authRoutes.post('/login', validateBody(loginSchema), authController.login);
authRoutes.get('/me', authenticate, authController.getMe);
