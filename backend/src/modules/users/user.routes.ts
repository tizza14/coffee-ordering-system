import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as userController from './user.controller';
import { updateRoleSchema } from './user.validators';

export const userRoutes = Router();

userRoutes.get(
  '/',
  authenticate,
  authorize(['admin']),
  userController.listUsers
);
userRoutes.patch(
  '/:id/role',
  authenticate,
  authorize(['admin']),
  validateBody(updateRoleSchema),
  userController.updateUserRole
);
