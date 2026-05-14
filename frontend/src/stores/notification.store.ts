import { defineStore } from 'pinia';
import type { Notification } from '../api/notification.api';
import * as notificationApi from '../api/notification.api';

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: [] as Notification[]
  }),
  actions: {
    push(notification: Notification) {
      this.items.unshift(notification);
    },
    async loadMemberNotifications() {
      const result = await notificationApi.getNotifications();
      this.items = result.data;
    },
    async loadGuestNotifications(lookupCode: string, phone?: string, guestToken?: string) {
      const result = await notificationApi.getGuestNotifications(lookupCode, phone, guestToken);
      this.items = result.data;
    },
    async markRead(id: string, lookupCode?: string, phone?: string, guestToken?: string) {
      const updated = await notificationApi.markNotificationRead(id, lookupCode, phone, guestToken);
      this.items = this.items.map((item) => (item.id === id ? updated : item));
    }
  }
});
