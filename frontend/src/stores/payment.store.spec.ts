import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePaymentStore } from './payment.store';
import * as paymentApi from '../api/payment.api';

vi.mock('../api/payment.api', () => ({
  requestLinePay: vi.fn(),
  confirmLinePay: vi.fn()
}));

const mockedPaymentApi = vi.mocked(paymentApi);

describe('paymentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('requests Line Pay and stores redirect data', async () => {
    mockedPaymentApi.requestLinePay.mockResolvedValue({
      paymentUrl: 'https://line-pay.example/pay',
      transactionId: 'txn-1',
      paymentStatus: 'payment_pending'
    });
    const paymentStore = usePaymentStore();

    await paymentStore.requestLinePay('o1', 'guest-token');

    expect(paymentStore.paymentUrl).toBe('https://line-pay.example/pay');
    expect(paymentStore.transactionId).toBe('txn-1');
  });

  it('confirms Line Pay and stores status', async () => {
    mockedPaymentApi.confirmLinePay.mockResolvedValue({
      orderId: 'o1',
      transactionId: 'txn-1',
      paymentStatus: 'paid',
      paidAmount: 120,
      pointsEarned: 1
    });
    const paymentStore = usePaymentStore();

    await paymentStore.confirmLinePay('o1', 'txn-1');

    expect(paymentStore.paymentStatus).toBe('paid');
  });
});
