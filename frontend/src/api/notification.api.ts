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
  const normalizedLookupCode = lookupCode.trim().toUpperCase();
  const normalizedPhone = phone?.trim();
  const normalizedGuestToken = guestToken?.trim();
  const response = await http.get<NotificationListResponse>(
    `/notifications/guest/${encodeURIComponent(normalizedLookupCode)}`,
    {
      params: normalizedPhone ? { phone: normalizedPhone } : undefined,
      headers: normalizedGuestToken
        ? { 'X-Guest-Token': normalizedGuestToken }
        : undefined
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
  const normalizedLookupCode = lookupCode?.trim().toUpperCase();
  const normalizedPhone = phone?.trim();
  const normalizedGuestToken = guestToken?.trim();
  const response = await http.patch<Notification>(
    `/notifications/${id}/read`,
    undefined,
    {
      params: normalizedLookupCode
        ? { lookupCode: normalizedLookupCode, phone: normalizedPhone }
        : undefined,
      headers: normalizedGuestToken
        ? { 'X-Guest-Token': normalizedGuestToken }
        : undefined
    }
  );
  return response.data;
}
