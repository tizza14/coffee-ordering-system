import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getParam, getQueryString } from '../../utils/request';
import * as orderService from '../orders/order.service';
import * as notificationService from './notification.service';

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

    const order = await orderService.getGuestOrder(lookupCode, phone, guestToken);

    const notifications =
      await notificationService.listGuestNotifications(lookupCode, order.id);
    res.json(notifications);
  }
);

export const subscribePush = asyncHandler(
  async (req: Request, res: Response) => {
    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { auth: string; p256dh: string };
    };
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      res.status(400).json({ message: 'Invalid subscription object' });
      return;
    }
    await notificationService.savePushSubscription(req.user!.id, { endpoint, keys });
    res.status(201).json({ ok: true });
  }
);

export const unsubscribePush = asyncHandler(
  async (req: Request, res: Response) => {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint) {
      res.status(400).json({ message: 'endpoint is required' });
      return;
    }
    await notificationService.removePushSubscription(req.user!.id, endpoint);
    res.json({ ok: true });
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
