import { defineStore } from 'pinia';
import type { CartItem } from './cart.store';
import * as orderApi from '../api/order.api';

const GUEST_SESSIONS_KEY = 'coffee-ordering-guest-sessions';
const LEGACY_GUEST_KEY = 'coffee-ordering-guest-tracking';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GuestTrackingSession {
  lookupCode: string;
  guestToken?: string;
  phone?: string;
  savedAt: number;
}

function toOrderItems(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity
  }));
}

function readAllGuestSessions(): GuestTrackingSession[] {
  if (typeof window === 'undefined') return [];

  // Migrate from legacy single-session format
  const legacy = window.localStorage.getItem(LEGACY_GUEST_KEY);
  if (legacy) {
    window.localStorage.removeItem(LEGACY_GUEST_KEY);
    try {
      const old = JSON.parse(legacy) as { lookupCode?: string; guestToken?: string; phone?: string };
      if (old.lookupCode) {
        const migrated: GuestTrackingSession[] = [{
          lookupCode: old.lookupCode,
          guestToken: old.guestToken,
          phone: old.phone,
          savedAt: Date.now()
        }];
        window.localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch { /* ignore */ }
  }

  const value = window.localStorage.getItem(GUEST_SESSIONS_KEY);
  if (!value) return [];
  try {
    const sessions = JSON.parse(value) as GuestTrackingSession[];
    if (!Array.isArray(sessions)) return [];
    const now = Date.now();
    const valid = sessions.filter(
      (s) => s.lookupCode && (now - (s.savedAt ?? 0)) < SESSION_TTL_MS
    );
    // Persist trimmed list back if any expired sessions were removed
    if (valid.length !== sessions.length) {
      window.localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    window.localStorage.removeItem(GUEST_SESSIONS_KEY);
    return [];
  }
}

function persistSessions(sessions: GuestTrackingSession[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
}

function upsertSession(
  sessions: GuestTrackingSession[],
  session: GuestTrackingSession
): GuestTrackingSession[] {
  const idx = sessions.findIndex((s) => s.lookupCode === session.lookupCode);
  const updated = [...sessions];
  if (idx >= 0) {
    updated[idx] = session;
  } else {
    updated.push(session);
  }
  return updated;
}

export const useOrderStore = defineStore('orders', {
  state: () => {
    const sessions = readAllGuestSessions();
    const latest = [...sessions].sort((a, b) => b.savedAt - a.savedAt)[0];
    return {
      currentOrder: null as orderApi.Order | null,
      myOrders: [] as orderApi.Order[],
      staffOrders: [] as orderApi.Order[],
      todaySummary: null as orderApi.TodayOrderSummary | null,
      guestSessions: sessions,
      // Kept for backward compat with LinePayConfirmView (most-recent session)
      guestToken: latest?.guestToken ?? '',
      guestLookupCode: latest?.lookupCode ?? '',
      guestPhone: latest?.phone ?? '',
      isLoading: false
    };
  },
  actions: {
    clearOrderLists() {
      this.myOrders = [];
      this.staffOrders = [];
      this.todaySummary = null;
      this.currentOrder = null;
    },
    // Save a session to the array; also updates backward-compat single fields
    saveGuestSession(session: Omit<GuestTrackingSession, 'savedAt'>) {
      const full: GuestTrackingSession = { ...session, savedAt: Date.now() };
      this.guestSessions = upsertSession(this.guestSessions, full);
      persistSessions(this.guestSessions);
      this.guestLookupCode = full.lookupCode;
      this.guestToken = full.guestToken ?? '';
      this.guestPhone = full.phone ?? '';
    },
    // Remove a single session by lookupCode (e.g., after a failed lookup)
    removeGuestSession(lookupCode: string) {
      this.guestSessions = this.guestSessions.filter((s) => s.lookupCode !== lookupCode);
      persistSessions(this.guestSessions);
      if (this.guestLookupCode === lookupCode) {
        const fallback = [...this.guestSessions].sort((a, b) => b.savedAt - a.savedAt)[0];
        this.guestLookupCode = fallback?.lookupCode ?? '';
        this.guestToken = fallback?.guestToken ?? '';
        this.guestPhone = fallback?.phone ?? '';
      }
    },
    // Clear all sessions (called on logout)
    clearAllGuestSessions() {
      this.guestSessions = [];
      this.guestLookupCode = '';
      this.guestToken = '';
      this.guestPhone = '';
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(GUEST_SESSIONS_KEY);
      }
    },
    // Backward-compat aliases
    setGuestTrackingSession(session: Omit<GuestTrackingSession, 'savedAt'>) {
      this.saveGuestSession(session);
    },
    clearGuestTrackingSession() {
      this.clearAllGuestSessions();
    },
    async createMemberOrder(
      items: CartItem[],
      guestInfo?: { phone: string; email?: string }
    ) {
      this.isLoading = true;
      try {
        this.currentOrder = await orderApi.createMemberOrder({
          items: toOrderItems(items),
          guestInfo
        });
        if (this.currentOrder.orderLookupCode && guestInfo?.phone) {
          this.setGuestTrackingSession({
            lookupCode: this.currentOrder.orderLookupCode,
            phone: guestInfo.phone
          });
        }
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
    async loadStaffOrders(date?: string) {
      const result = await orderApi.getStaffOrders(date ? { date } : undefined);
      this.staffOrders = result.data;
    },
    async loadAllOrdersForStaff() {
      const result = await orderApi.getStaffOrders({ all: true });
      this.myOrders = result.data;
    },
    async loadTodaySummary(date?: string) {
      const summary = await orderApi.getTodayOrderSummary(date);
      this.todaySummary = { ...summary, soldItems: summary.soldItems ?? [] };
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
      this.currentOrder = null;
      this.currentOrder = await orderApi.getGuestOrder(
        lookupCode,
        phone,
        guestToken
      );
      if (this.currentOrder.orderLookupCode) {
        this.saveGuestSession({
          lookupCode: this.currentOrder.orderLookupCode,
          guestToken,
          phone
        });
      }
      return this.currentOrder;
    }
  }
});
