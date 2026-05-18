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

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a member order (user/admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer, minimum: 1 }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
orderRoutes.post(
  '/',
  authenticate,
  authorize(['user', 'admin']),
  validateBody(createOrderSchema),
  orderController.createMemberOrder
);

/**
 * @openapi
 * /orders/guest:
 *   post:
 *     tags: [Orders]
 *     summary: Create a guest order (public)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, phone]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer, minimum: 1 }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Guest order created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/Order' }
 *                 - type: object
 *                   properties:
 *                     guestToken: { type: string }
 */
orderRoutes.post(
  '/guest',
  validateBody(createGuestOrderSchema),
  orderController.createGuestOrder
);

/**
 * @openapi
 * /orders/redeem:
 *   post:
 *     tags: [Orders]
 *     summary: Create a redeem order using 3 points (user only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *     responses:
 *       201:
 *         description: Redeem order created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Insufficient points or product not redeemable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
orderRoutes.post(
  '/redeem',
  authenticate,
  authorize(['user']),
  validateBody(createRedeemOrderSchema),
  orderController.createRedeemOrder
);

/**
 * @openapi
 * /orders/guest/{lookupCode}:
 *   get:
 *     tags: [Orders]
 *     summary: Get guest order by lookup code (public)
 *     parameters:
 *       - in: path
 *         name: lookupCode
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: phone
 *         schema: { type: string }
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: Guest order
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
orderRoutes.get('/guest/:lookupCode', orderController.getGuestOrder);

orderRoutes.get(
  '/summary/today',
  authenticate,
  authorize(['staff', 'admin']),
  orderController.getTodayStaffSummary
);

orderRoutes.get(
  '/sales',
  authenticate,
  authorize(['staff', 'admin']),
  orderController.getSalesReport
);

/**
 * @openapi
 * /orders/my:
 *   get:
 *     tags: [Orders]
 *     summary: List current user's orders (user/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Order' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
orderRoutes.get(
  '/my',
  authenticate,
  authorize(['user', 'admin']),
  orderController.listMyOrders
);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List all orders (staff/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, preparing, ready, completed, cancelled] }
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [unpaid, paid, refunded] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Order' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
orderRoutes.get(
  '/',
  authenticate,
  authorize(['staff', 'admin']),
  orderController.listStaffOrders
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order by ID (owner, staff, or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order detail
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
orderRoutes.get(
  '/:id',
  authenticate,
  authorize(['user', 'staff', 'admin']),
  orderController.getOrderById
);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [accepted, preparing, ready, completed, cancelled] }
 *     responses:
 *       200:
 *         description: Updated order
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
orderRoutes.patch(
  '/:id/status',
  authenticate,
  authorize(['user', 'staff', 'admin']),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);
