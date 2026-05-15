import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import { useNotificationStore } from './notification.store';
import type { Notification } from '../api/notification.api';
import type { Order } from '../api/order.api';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  (import.meta.env.PROD
    ? 'https://coffee-ordering-system-60aw.onrender.com'
    : 'http://localhost:3000');

export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null as Socket | null,
    latestOrderUpdate: null as Partial<Order> | null
  }),
  actions: {
    connect(guest?: { orderLookupCode: string; guestToken: string }) {
      if (this.socket?.connected) return;
      const authStore = useAuthStore();
      this.socket = io(socketUrl, {
        auth: {
          token: authStore.accessToken || undefined,
          orderLookupCode: guest?.orderLookupCode,
          guestToken: guest?.guestToken
        }
      });
      const notificationStore = useNotificationStore();
      this.socket.on('order_updated', (payload: Partial<Order>) => {
        this.latestOrderUpdate = payload;
      });
      this.socket.on('notification', (payload: Notification) => {
        notificationStore.push(payload);
      });
    },
    joinOrderRoom(orderId: string) {
      this.socket?.emit('join_room', { room: `room:order:${orderId}` });
    },
    disconnect() {
      this.socket?.disconnect();
      this.socket = null;
    }
  }
});
