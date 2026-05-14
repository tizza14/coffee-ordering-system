import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as orderService from '../orders/order.service';
import * as notificationService from './notification.service';

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export const listUserNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const notifications = await notificationService.listUserNotifications(
      req.user!.id
    );
    res.json(notifications);
  }
);

export const listGuestNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const lookupCode = getParam(req.params.lookupCode);
    const phone = getQueryString(req.query.phone);
    const guestToken = getQueryString(req.headers['x-guest-token']);

    // Verify guest access first
    await orderService.getGuestOrder(lookupCode, phone, guestToken);

    const notifications =
      await notificationService.listGuestNotifications(lookupCode);
    res.json(notifications);
  }
);

export const markNotificationRead = asyncHandler(
  async (req: Request, res: Response) => {
    const notificationId = getParam(req.params.id);
    const guestToken = getQueryString(req.headers['x-guest-token']);
    const phone = getQueryString(req.query.phone);
    const lookupCode = getQueryString(req.query.lookupCode);

    let actor: { id?: string; guestLookupCode?: string } = {};

    if (req.user) {
      actor.id = req.user.id;
    } else if (lookupCode) {
      // Verify guest access
      await orderService.getGuestOrder(lookupCode, phone, guestToken);
      actor.guestLookupCode = lookupCode;
    }

    const notification = await notificationService.markNotificationRead(
      notificationId,
      actor
    );
    res.json(notification);
  }
);
