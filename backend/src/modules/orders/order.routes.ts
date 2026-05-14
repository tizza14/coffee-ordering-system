import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as orderController from './order.controller';
import {
  createGuestOrderSchema,
  createOrderSchema,
  createRedeemOrderSchema,
  updateOrderStatusSchema
} from './order.validators';

export const orderRoutes = Router();

orderRoutes.post(
  '/',
  authenticate,
  authorize(['user', 'admin']),
  validateBody(createOrderSchema),
  orderController.createMemberOrder
);
orderRoutes.post('/guest', validateBody(createGuestOrderSchema), orderController.createGuestOrder);
orderRoutes.post(
  '/redeem',
  authenticate,
  authorize(['user']),
  validateBody(createRedeemOrderSchema),
  orderController.createRedeemOrder
);
orderRoutes.get('/guest/:lookupCode', orderController.getGuestOrder);
orderRoutes.get('/my', authenticate, authorize(['user', 'admin']), orderController.listMyOrders);
orderRoutes.get('/', authenticate, authorize(['staff', 'admin']), orderController.listStaffOrders);
orderRoutes.get('/:id', authenticate, authorize(['user', 'staff', 'admin']), orderController.getOrderById);
orderRoutes.patch(
  '/:id/status',
  authenticate,
  authorize(['user', 'staff', 'admin']),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);
