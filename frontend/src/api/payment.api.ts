import { http } from './http';

export interface LinePayRequestResponse {
  paymentUrl: string;
  transactionId: string;
  paymentStatus: string;
}

export interface LinePayConfirmResponse {
  orderId: string;
  transactionId: string;
  paymentStatus: string;
  paidAmount: number;
  pointsEarned: number;
}

export async function requestLinePay(orderId: string, guestToken?: string) {
  const response = await http.post<LinePayRequestResponse>(
    '/payments/line-pay/request',
    { orderId },
    {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined
    }
  );
  return response.data;
}

export async function confirmLinePay(
  orderId: string,
  transactionId: string,
  guestToken?: string
) {
  const response = await http.post<LinePayConfirmResponse>(
    '/payments/line-pay/confirm',
    { orderId, transactionId },
    {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined
    }
  );
  return response.data;
}
