import crypto from 'crypto';
import { env } from '../../config/env';

export interface LinePayRequestPayload {
  amount: number;
  currency: 'TWD';
  orderId: string;
  packages: Array<{
    id: string;
    amount: number;
    products: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }>;
  redirectUrls: {
    confirmUrl: string;
    cancelUrl: string;
  };
}

export interface LinePayRequestResult {
  transactionId: string;
  paymentUrl: string;
  rawResponse: unknown;
}

export interface LinePayConfirmResult {
  transactionId: string;
  amount: number;
  currency: string;
  rawResponse: unknown;
}

function createSignature(path: string, body: unknown, nonce: string) {
  const message = `${env.linePayChannelSecret}${path}${JSON.stringify(body)}${nonce}`;
  return crypto
    .createHmac('sha256', env.linePayChannelSecret)
    .update(message)
    .digest('base64');
}

async function postLinePay<T>(path: string, body: unknown): Promise<T> {
  const nonce = crypto.randomUUID();
  const response = await fetch(`${env.linePayApiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': env.linePayChannelId,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': createSignature(path, body, nonce)
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Line Pay request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function requestPayment(
  payload: LinePayRequestPayload
): Promise<LinePayRequestResult> {
  const rawResponse = await postLinePay<{
    info?: {
      transactionId?: string;
      paymentUrl?: { web?: string; app?: string };
    };
  }>('/v4/payments/request', payload);

  return {
    transactionId: String(rawResponse.info?.transactionId ?? ''),
    paymentUrl: String(rawResponse.info?.paymentUrl?.web ?? rawResponse.info?.paymentUrl?.app ?? ''),
    rawResponse
  };
}

export async function confirmPayment(
  transactionId: string,
  amount: number,
  currency: 'TWD'
): Promise<LinePayConfirmResult> {
  const path = `/v4/payments/${transactionId}/confirm`;
  const rawResponse = await postLinePay<{
    info?: { transactionId?: string; payInfo?: Array<{ amount?: number }> };
  }>(path, { amount, currency });

  return {
    transactionId: String(rawResponse.info?.transactionId ?? transactionId),
    amount: Number(rawResponse.info?.payInfo?.[0]?.amount ?? amount),
    currency,
    rawResponse
  };
}
