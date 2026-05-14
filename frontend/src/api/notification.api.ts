import { http } from './http';

export interface Notification {
  id: string;
  userId?: string;
  guestOrderLookupCode?: string;
  orderId: string;
  audience: 'user' | 'guest' | 'staff';
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
}

export async function getNotifications() {
  const response = await http.get<NotificationListResponse>('/notifications');
  return response.data;
}

export async function getGuestNotifications(
  lookupCode: string,
  phone?: string,
  guestToken?: string
) {
  const response = await http.get<NotificationListResponse>(
    `/notifications/guest/${lookupCode}`,
    {
      params: phone ? { phone } : undefined,
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined
    }
  );
  return response.data;
}

export async function markNotificationRead(
  id: string,
  lookupCode?: string,
  phone?: string,
  guestToken?: string
) {
  const response = await http.patch<Notification>(
    `/notifications/${id}/read`,
    undefined,
    {
      params: lookupCode ? { lookupCode, phone } : undefined,
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined
    }
  );
  return response.data;
}
