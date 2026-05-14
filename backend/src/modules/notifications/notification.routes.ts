import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as notificationController from './notification.controller';

export const notificationRoutes = Router();

notificationRoutes.get(
  '/',
  authenticate,
  notificationController.listUserNotifications
);
notificationRoutes.get(
  '/guest/:lookupCode',
  notificationController.listGuestNotifications
);
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
