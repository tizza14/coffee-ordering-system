import { http } from './http';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId?: string;
  guestInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  orderLookupCode?: string;
  guestToken?: string;
  items: OrderItem[];
  totalAmount: number;
  orderType: 'purchase' | 'redeem';
  paymentStatus:
    | 'unpaid'
    | 'payment_pending'
    | 'paid'
    | 'payment_failed'
    | 'refunded';
  status:
    | 'pending'
    | 'accepted'
    | 'preparing'
    | 'ready'
    | 'completed'
    | 'cancelled';
  paidAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  data: Order[];
}

export interface CreateOrderPayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface CreateGuestOrderPayload extends CreateOrderPayload {
  guestInfo: {
    name: string;
    phone: string;
    email?: string;
  };
}

export async function createMemberOrder(payload: CreateOrderPayload) {
  const response = await http.post<Order>('/orders', payload);
  return response.data;
}

export async function createGuestOrder(payload: CreateGuestOrderPayload) {
  const response = await http.post<Order>('/orders/guest', payload);
  return response.data;
}

export async function getMyOrders() {
  const response = await http.get<OrderListResponse>('/orders/my');
  return response.data;
}

export async function getStaffOrders() {
  const response = await http.get<OrderListResponse>('/orders');
  return response.data;
}

export async function updateOrderStatus(
  orderId: string,
  status: 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
) {
  const response = await http.patch<Order>(`/orders/${orderId}/status`, {
    status
  });
  return response.data;
}

export async function getGuestOrder(
  lookupCode: string,
  phone?: string,
  guestToken?: string
) {
  const response = await http.get<Order>(`/orders/guest/${lookupCode}`, {
    params: phone ? { phone } : undefined,
    headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined
  });
  return response.data;
}
