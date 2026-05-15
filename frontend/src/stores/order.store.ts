import { defineStore } from 'pinia';
import type { CartItem } from './cart.store';
import * as orderApi from '../api/order.api';

const GUEST_TRACKING_STORAGE_KEY = 'coffee-ordering-guest-tracking';

interface GuestTrackingSession {
  lookupCode: string;
  guestToken: string;
  phone?: string;
}

function toOrderItems(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity
  }));
}

function readGuestTrackingSession() {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem(GUEST_TRACKING_STORAGE_KEY);
  if (!value) return null;

  try {
    const session = JSON.parse(value) as GuestTrackingSession;
    if (!session.lookupCode || !session.guestToken) return null;
    return session;
  } catch {
    window.localStorage.removeItem(GUEST_TRACKING_STORAGE_KEY);
    return null;
  }
}

function writeGuestTrackingSession(session: GuestTrackingSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    GUEST_TRACKING_STORAGE_KEY,
    JSON.stringify(session)
  );
}

export const useOrderStore = defineStore('orders', {
  state: () => {
    const guestTrackingSession = readGuestTrackingSession();
    return {
      currentOrder: null as orderApi.Order | null,
      myOrders: [] as orderApi.Order[],
      staffOrders: [] as orderApi.Order[],
      todaySummary: null as orderApi.TodayOrderSummary | null,
      guestToken: guestTrackingSession?.guestToken ?? '',
      guestLookupCode: guestTrackingSession?.lookupCode ?? '',
      guestPhone: guestTrackingSession?.phone ?? '',
      isLoading: false
    };
  },
  actions: {
    setGuestTrackingSession(session: GuestTrackingSession) {
      this.guestLookupCode = session.lookupCode;
      this.guestToken = session.guestToken;
      this.guestPhone = session.phone ?? '';
      writeGuestTrackingSession(session);
    },
    async createMemberOrder(items: CartItem[]) {
      this.isLoading = true;
      try {
        this.currentOrder = await orderApi.createMemberOrder({
          items: toOrderItems(items)
        });
        return this.currentOrder;
      } finally {
        this.isLoading = false;
      }
    },
    async createGuestOrder(
      items: CartItem[],
      guestInfo: { name: string; phone: string; email?: string }
    ) {
      this.isLoading = true;
      try {
        this.currentOrder = await orderApi.createGuestOrder({
          guestInfo,
          items: toOrderItems(items)
        });
        if (this.currentOrder.orderLookupCode && this.currentOrder.guestToken) {
          this.setGuestTrackingSession({
            lookupCode: this.currentOrder.orderLookupCode,
            guestToken: this.currentOrder.guestToken,
            phone: guestInfo.phone
          });
        }
        return this.currentOrder;
      } finally {
        this.isLoading = false;
      }
    },
    async loadMyOrders() {
      const result = await orderApi.getMyOrders();
      this.myOrders = result.data;
    },
    async loadStaffOrders() {
      const result = await orderApi.getStaffOrders();
      this.staffOrders = result.data;
    },
    async loadTodaySummary() {
      const summary = await orderApi.getTodayOrderSummary();
      let soldItems = summary.soldItems ?? [];

      if (soldItems.length === 0 && summary.itemQuantity > 0) {
        const allPaid = await orderApi.getStaffOrders({ paymentStatus: 'paid', limit: 200 });
        const map = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
        for (const order of allPaid.data) {
          if (order.paymentStatus !== 'paid') continue;
          for (const item of order.items) {
            const cur = map.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, revenue: 0 };
            cur.quantity += item.quantity;
            cur.revenue += item.price * item.quantity;
            map.set(item.productId, cur);
          }
        }
        soldItems = [...map.values()].sort((a, b) => b.quantity - a.quantity);
      }

      this.todaySummary = { ...summary, soldItems };
      return this.todaySummary;
    },
    async updateStaffOrderStatus(
      orderId: string,
      status: 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
    ) {
      const order = await orderApi.updateOrderStatus(orderId, status);
      this.staffOrders = this.staffOrders.map((item) =>
        item.id === order.id ? order : item
      );
      return order;
    },
    async loadGuestOrder(
      lookupCode: string,
      phone?: string,
      guestToken?: string
    ) {
      this.currentOrder = await orderApi.getGuestOrder(
        lookupCode,
        phone,
        guestToken
      );
      if (guestToken && this.currentOrder.orderLookupCode) {
        this.setGuestTrackingSession({
          lookupCode: this.currentOrder.orderLookupCode,
          guestToken,
          phone
        });
      }
      return this.currentOrder;
    }
  }
});
