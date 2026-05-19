import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as pointController from './point.controller';

export const pointRoutes = Router();

/**
 * @openapi
 * /points/history:
 *   get:
 *     tags: [Points]
 *     summary: Get point transaction history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of point transactions derived from orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       orderId: { type: string }
 *                       orderLookupCode: { type: string, nullable: true }
 *                       orderType: { type: string, enum: [purchase, redeem] }
 *                       delta: { type: integer, description: "Positive = earned, negative = redeemed" }
 *                       createdAt: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
pointRoutes.get('/history', authenticate, pointController.getHistory);
