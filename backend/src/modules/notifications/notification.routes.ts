import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as notificationController from './notification.controller';

export const notificationRoutes = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Notification' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
notificationRoutes.get(
  '/',
  authenticate,
  notificationController.listUserNotifications
);

notificationRoutes.post(
  '/push/subscribe',
  authenticate,
  notificationController.subscribePush
);

notificationRoutes.delete(
  '/push/unsubscribe',
  authenticate,
  notificationController.unsubscribePush
);

/**
 * @openapi
 * /notifications/guest/{lookupCode}:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for a guest order
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
 *         description: Guest notification list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Notification' }
 */
notificationRoutes.get(
  '/guest/:lookupCode',
  notificationController.listGuestNotifications
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read (member or guest)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: phone
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Notification' }
 */
notificationRoutes.patch(
  '/:id/read',
  (req, res, next) => {
    // Optional authentication for members, otherwise it uses guest lookup
    if (req.headers.authorization) {
      return authenticate(req, res, next);
    }
    next();
  },
  notificationController.markNotificationRead
);
