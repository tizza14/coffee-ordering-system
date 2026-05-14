import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import {
  NotificationModel,
  type NotificationDocument
} from './notification.model';

export async function createNotification(data: {
  userId?: string;
  guestOrderLookupCode?: string;
  orderId: string;
  audience: 'user' | 'guest' | 'staff';
  type: string;
  message: string;
}) {
  const notification = await NotificationModel.create({
    ...data,
    userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
    orderId: new mongoose.Types.ObjectId(data.orderId)
  });
  return notification;
}

export async function listUserNotifications(userId: string) {
  const notifications = await NotificationModel.find({
    userId: new mongoose.Types.ObjectId(userId)
  }).sort({ createdAt: -1 });
  return { data: notifications.map(toNotificationResponse) };
}

export async function listGuestNotifications(lookupCode: string) {
  const notifications = await NotificationModel.find({
    guestOrderLookupCode: lookupCode
  }).sort({ createdAt: -1 });
  return { data: notifications.map(toNotificationResponse) };
}

export async function markNotificationRead(
  notificationId: string,
  actor: { id?: string; guestLookupCode?: string }
) {
  const notification = await NotificationModel.findById(notificationId);
  if (!notification) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Notification not found');
  }

  // Permission check
  if (actor.id) {
    if (String(notification.userId) !== actor.id) {
      throw new ApiError(403, 'FORBIDDEN_ROLE', 'Access denied');
    }
  } else if (actor.guestLookupCode) {
    if (notification.guestOrderLookupCode !== actor.guestLookupCode) {
      throw new ApiError(403, 'FORBIDDEN_ROLE', 'Access denied');
    }
  } else {
    throw new ApiError(403, 'FORBIDDEN_ROLE', 'Access denied');
  }

  notification.isRead = true;
  await notification.save();
  return toNotificationResponse(notification);
}

function toNotificationResponse(notif: NotificationDocument) {
  return {
    id: String(notif._id),
    userId: notif.userId ? String(notif.userId) : undefined,
    guestOrderLookupCode: notif.guestOrderLookupCode,
    orderId: String(notif.orderId),
    audience: notif.audience,
    type: notif.type,
    message: notif.message,
    isRead: notif.isRead,
    createdAt: notif.createdAt
  };
}
