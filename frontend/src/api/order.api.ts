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

interface ApiError extends Error {
  code?: string;
}

export interface TodayOrderSummary {
  date: string;
  timezone: string;
  totalOrders: number;
  paidOrders: number;
  paidRevenue: number;
  averagePaidOrderValue: number;
  itemQuantity: number;
  soldItems?: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  guestOrders: number;
  memberOrders: number;
  statusCounts: Record<Order['status'], number>;
  paymentStatusCounts: Record<Order['paymentStatus'], number>;
}

export interface CreateOrderPayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  guestInfo?: {
    phone: string;
    email?: string;
  };
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

export async function createRedeemOrder(productId: string) {
  const response = await http.post<Order & { remainingPoints: number }>(
    '/orders/redeem',
    { productId }
  );
  return response.data;
}

export async function getMyOrders() {
  const response = await http.get<OrderListResponse>('/orders/my');
  return response.data;
}

export async function getStaffOrders(params?: {
  paymentStatus?: string;
  date?: string;
  all?: boolean;
  limit?: number;
}) {
  const response = await http.get<OrderListResponse>('/orders', { params });
  return response.data;
}

export async function getTodayOrderSummary(date?: string) {
  const response = await http.get<TodayOrderSummary>('/orders/summary/today', {
    params: date ? { date } : undefined
  });
  return response.data;
}

export interface SalesBucket {
  label: string;
  date: string;
  revenue: number;
  orders: number;
  items: number;
}

export interface SalesReport {
  period: 'day' | 'week' | 'month' | 'year' | 'range';
  label: string;
  totalRevenue: number;
  totalOrders: number;
  totalItems: number;
  soldItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  breakdown: SalesBucket[];
}

export async function getSalesReport(params: {
  period: 'day' | 'week' | 'month' | 'year' | 'range';
  date?: string;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}) {
  const response = await http.get<SalesReport>('/orders/sales', { params });
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
  const normalizedLookupCode = lookupCode.trim().toUpperCase();
  const normalizedPhone = phone?.trim();
  const normalizedGuestToken = guestToken?.trim();
  const response = await http.get<Order | Order[] | OrderListResponse>(
    `/orders/guest/${encodeURIComponent(normalizedLookupCode)}`,
    {
      params: normalizedPhone ? { phone: normalizedPhone } : undefined,
      headers: normalizedGuestToken
        ? { 'X-Guest-Token': normalizedGuestToken }
        : undefined
    }
  );
  const payload = response.data;
  const order = Array.isArray(payload)
    ? payload[0]
    : Array.isArray((payload as OrderListResponse).data)
      ? (payload as OrderListResponse).data[0]
      : (payload as Order);

  if (!order?.id) {
    const error = new Error('Order not found') as ApiError;
    error.code = 'ORDER_NOT_FOUND';
    throw error;
  }

  return order;
}
