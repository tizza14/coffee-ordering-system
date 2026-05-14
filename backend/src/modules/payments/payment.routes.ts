import { Router } from 'express';
import { validateBody } from '../../middlewares/validate.middleware';
import * as paymentController from './payment.controller';
import {
  linePayConfirmSchema,
  linePayRequestSchema
} from './payment.validators';

export const paymentRoutes = Router();

/**
 * @openapi
 * /payments/line-pay/request:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate a Line Pay payment request
 *     security:
 *       - bearerAuth: []
 *       - guestToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string }
 *     responses:
 *       200:
 *         description: Line Pay payment URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl: { type: string, format: uri }
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
paymentRoutes.post(
  '/line-pay/request',
  validateBody(linePayRequestSchema),
  paymentController.requestLinePay
);

/**
 * @openapi
 * /payments/line-pay/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm a Line Pay payment (idempotent)
 *     security:
 *       - bearerAuth: []
 *       - guestToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionId, orderId]
 *             properties:
 *               transactionId: { type: string }
 *               orderId: { type: string }
 *     responses:
 *       200:
 *         description: Payment confirmed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       409:
 *         description: Amount mismatch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
paymentRoutes.post(
  '/line-pay/confirm',
  validateBody(linePayConfirmSchema),
  paymentController.confirmLinePay
);

/**
 * @openapi
 * /payments/line-pay/cancel:
 *   get:
 *     tags: [Payments]
 *     summary: Handle Line Pay payment cancellation redirect
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cancellation acknowledged
 */
paymentRoutes.get('/line-pay/cancel', paymentController.cancelLinePay);
