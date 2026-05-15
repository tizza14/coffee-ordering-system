import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderStore } from './order.store';
import * as orderApi from '../api/order.api';

vi.mock('../api/order.api', () => ({
  createMemberOrder: vi.fn(),
  createGuestOrder: vi.fn(),
  getMyOrders: vi.fn(),
  getStaffOrders: vi.fn(),
  getTodayOrderSummary: vi.fn(),
  getGuestOrder: vi.fn(),
  updateOrderStatus: vi.fn()
}));

const mockedOrderApi = vi.mocked(orderApi);
const cartItems = [{ productId: 'p1', name: 'Latte', price: 120, quantity: 2 }];
const order = {
  id: 'o1',
  items: [],
  totalAmount: 240,
  orderType: 'purchase' as const,
  paymentStatus: 'unpaid' as const,
  status: 'pending' as const,
  paidAmount: 0,
  pointsEarned: 0,
  pointsRedeemed: 0,
  createdAt: '',
  updatedAt: ''
};

describe('orderStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('creates member order from cart items', async () => {
    mockedOrderApi.createMemberOrder.mockResolvedValue(order);
    const orderStore = useOrderStore();

    await orderStore.createMemberOrder(cartItems);

    expect(mockedOrderApi.createMemberOrder).toHaveBeenCalledWith({
      items: [{ productId: 'p1', quantity: 2 }]
    });
    expect(orderStore.currentOrder?.id).toBe('o1');
  });

  it('stores guest token after guest order', async () => {
    mockedOrderApi.createGuestOrder.mockResolvedValue({
      ...order,
      orderLookupCode: 'ABC123',
      guestToken: 'guest-token'
    });
    const orderStore = useOrderStore();

    await orderStore.createGuestOrder(cartItems, {
      name: 'Guest',
      phone: '0912345678'
    });

    expect(orderStore.guestToken).toBe('guest-token');
    expect(orderStore.guestLookupCode).toBe('ABC123');
    expect(orderStore.guestPhone).toBe('0912345678');
    expect(
      JSON.parse(localStorage.getItem('coffee-ordering-guest-tracking') ?? '{}')
    ).toEqual({
      lookupCode: 'ABC123',
      guestToken: 'guest-token',
      phone: '0912345678'
    });
  });

  it('loads staff orders and updates an order status', async () => {
    mockedOrderApi.getStaffOrders.mockResolvedValue({ data: [order] });
    mockedOrderApi.updateOrderStatus.mockResolvedValue({
      ...order,
      status: 'accepted'
    });
    const orderStore = useOrderStore();

    await orderStore.loadStaffOrders();
    await orderStore.updateStaffOrderStatus('o1', 'accepted');

    expect(mockedOrderApi.getStaffOrders).toHaveBeenCalled();
    expect(mockedOrderApi.updateOrderStatus).toHaveBeenCalledWith(
      'o1',
      'accepted'
    );
    expect(orderStore.staffOrders[0].status).toBe('accepted');
  });

  it('loads today staff summary', async () => {
    mockedOrderApi.getTodayOrderSummary.mockResolvedValue({
      date: '2026-05-15',
      timezone: 'Asia/Taipei',
      totalOrders: 3,
      paidOrders: 2,
      paidRevenue: 360,
      averagePaidOrderValue: 180,
      itemQuantity: 4,
      guestOrders: 2,
      memberOrders: 1,
      statusCounts: {
        pending: 1,
        accepted: 0,
        preparing: 0,
        ready: 1,
        completed: 1,
        cancelled: 0
      },
      paymentStatusCounts: {
        unpaid: 1,
        payment_pending: 0,
        paid: 2,
        payment_failed: 0,
        refunded: 0
      }
    });
    const orderStore = useOrderStore();

    await orderStore.loadTodaySummary();

    expect(orderStore.todaySummary?.paidRevenue).toBe(360);
    expect(orderStore.todaySummary?.timezone).toBe('Asia/Taipei');
  });
});
