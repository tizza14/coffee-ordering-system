import { defineStore } from 'pinia';
import type { CartItem } from './cart.store';
import * as orderApi from '../api/order.api';

function toOrderItems(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity
  }));
}

export const useOrderStore = defineStore('orders', {
  state: () => ({
    currentOrder: null as orderApi.Order | null,
    myOrders: [] as orderApi.Order[],
    staffOrders: [] as orderApi.Order[],
    guestToken: '',
    isLoading: false
  }),
  actions: {
    async createMemberOrder(items: CartItem[]) {
      this.isLoading = true;
      try {
        this.currentOrder = await orderApi.createMemberOrder({ items: toOrderItems(items) });
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
        this.guestToken = this.currentOrder.guestToken ?? '';
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
    async updateStaffOrderStatus(
      orderId: string,
      status: 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
    ) {
      const order = await orderApi.updateOrderStatus(orderId, status);
      this.staffOrders = this.staffOrders.map((item) => (item.id === order.id ? order : item));
      return order;
    },
    async loadGuestOrder(lookupCode: string, phone?: string, guestToken?: string) {
      this.currentOrder = await orderApi.getGuestOrder(lookupCode, phone, guestToken);
      if (guestToken) this.guestToken = guestToken;
      return this.currentOrder;
    }
  }
});
