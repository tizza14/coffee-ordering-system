import type { Order } from '../api/order.api';

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function paymentLabel(status: Order['paymentStatus']) {
  const labels: Record<Order['paymentStatus'], string> = {
    unpaid: '未付款',
    payment_pending: '付款處理中',
    paid: '已付款',
    payment_failed: '付款失敗',
    refunded: '已退款'
  };
  return labels[status];
}

export function displayOrderCode(order: Pick<Order, 'orderLookupCode' | 'orderType'>) {
  if (order.orderLookupCode) return order.orderLookupCode;
  if (order.orderType === 'redeem') return '兌換訂單';
  return '未產生查詢碼';
}
