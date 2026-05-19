import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore } from './notification.store';
import * as notificationApi from '../api/notification.api';

vi.mock('../api/notification.api', () => ({
  getNotifications: vi.fn(),
  getGuestNotifications: vi.fn(),
  markNotificationRead: vi.fn()
}));

const mockedNotificationApi = vi.mocked(notificationApi);
const notification = {
  id: 'n1',
  orderId: 'o1',
  audience: 'user' as const,
  type: 'order_status_updated',
  message: 'Order updated',
  isRead: false,
  createdAt: ''
};

describe('notificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('loads member notifications and pushes socket notification', async () => {
    mockedNotificationApi.getNotifications.mockResolvedValue({
      data: [notification]
    });
    const notificationStore = useNotificationStore();

    await notificationStore.loadMemberNotifications();
    notificationStore.push({ ...notification, id: 'n2' });

    expect(notificationStore.items.map((item) => item.id)).toEqual([
      'n2',
      'n1'
    ]);
  });

  it('marks notification read', async () => {
    mockedNotificationApi.markNotificationRead.mockResolvedValue({
      ...notification,
      isRead: true
    });
    const notificationStore = useNotificationStore();
    notificationStore.items = [notification];

    await notificationStore.markRead('n1');

    expect(notificationStore.items[0].isRead).toBe(true);
  });

  it('loads guest notifications and replaces items list', async () => {
    const guestNotif = {
      ...notification,
      id: 'gn1',
      audience: 'guest' as const,
      guestOrderLookupCode: 'GUEST01'
    };
    mockedNotificationApi.getGuestNotifications.mockResolvedValue({
      orderId: 'order-id-1',
      notifications: [guestNotif]
    });
    const notificationStore = useNotificationStore();

    await notificationStore.loadGuestNotifications('GUEST01', '0912345678');

    expect(mockedNotificationApi.getGuestNotifications).toHaveBeenCalledWith(
      'GUEST01',
      '0912345678',
      undefined
    );
    expect(notificationStore.items).toHaveLength(1);
    expect(notificationStore.items[0].id).toBe('gn1');
  });

  it('marks guest notification read using lookupCode and phone', async () => {
    const guestNotif = {
      ...notification,
      id: 'gn1',
      audience: 'guest' as const,
      guestOrderLookupCode: 'GUEST01',
      isRead: false
    };
    mockedNotificationApi.markNotificationRead.mockResolvedValue({
      ...guestNotif,
      isRead: true
    });
    const notificationStore = useNotificationStore();
    notificationStore.items = [guestNotif];

    await notificationStore.markRead('gn1', 'GUEST01', '0912345678');

    expect(mockedNotificationApi.markNotificationRead).toHaveBeenCalledWith(
      'gn1',
      'GUEST01',
      '0912345678',
      undefined
    );
    expect(notificationStore.items[0].isRead).toBe(true);
  });
});
