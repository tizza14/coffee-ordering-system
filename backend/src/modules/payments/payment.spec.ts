import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} from '../../test/testDb';
import { OrderModel } from '../orders/order.model';
import { ProductModel } from '../products/product.model';
import { UserModel } from '../users/user.model';
import { PaymentModel } from './payment.model';
import * as linePayClient from './linePay.client';

jest.mock('./linePay.client');

const mockedLinePayClient = jest.mocked(linePayClient);
const app = createApp();

beforeAll(connectTestDb);
beforeEach(() => {
  jest.resetAllMocks();
  mockedLinePayClient.requestPayment.mockResolvedValue({
    transactionId: 'txn-123',
    paymentUrl: 'https://line-pay.example/pay',
    rawResponse: { ok: true }
  });
  mockedLinePayClient.confirmPayment.mockResolvedValue({
    transactionId: 'txn-123',
    amount: 240,
    currency: 'TWD',
    rawResponse: { ok: true }
  });
});
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function createProduct(price = 120) {
  return ProductModel.create({
    name: 'Latte',
    price,
    category: 'coffee',
    description: 'Milk coffee',
    isAvailable: true
  });
}

async function loginAsUser() {
  const email = 'buyer@example.com';
  const password = 'password123';

  const user = await UserModel.create({
    name: 'Buyer',
    email,
    password: await bcrypt.hash(password, 10),
    role: 'user',
    points: 0
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return {
    token: response.body.accessToken as string,
    userId: String(user._id)
  };
}

async function createMemberOrder(quantity = 2) {
  const product = await createProduct();
  const { token, userId } = await loginAsUser();
  const orderResponse = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ productId: String(product._id), quantity }]
    });

  return { token, userId, orderId: orderResponse.body.id as string };
}

describe('Line Pay API', () => {
  it('creates a Line Pay payment request and updates order to payment_pending', async () => {
    const { token, orderId } = await createMemberOrder();

    const response = await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    expect(response.status).toBe(201);
    expect(response.body.paymentUrl).toBe('https://line-pay.example/pay');
    expect(response.body.transactionId).toBe('txn-123');
    expect(response.body.paymentStatus).toBe('payment_pending');
    expect(mockedLinePayClient.requestPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 240,
        currency: 'TWD'
      })
    );

    await expect(OrderModel.findById(orderId)).resolves.toMatchObject({
      paymentStatus: 'payment_pending',
      linePayTransactionId: 'txn-123'
    });
    await expect(PaymentModel.findOne({ orderId })).resolves.toMatchObject({
      transactionId: 'txn-123',
      amount: 240,
      status: 'payment_pending'
    });
  });

  it('confirms Line Pay payment and updates order to paid', async () => {
    const { token, orderId } = await createMemberOrder();
    await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    const response = await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, transactionId: 'txn-123' });

    expect(response.status).toBe(200);
    expect(response.body.paymentStatus).toBe('paid');
    expect(response.body.paidAmount).toBe(240);
    expect(response.body.pointsEarned).toBe(2);

    await expect(OrderModel.findById(orderId)).resolves.toMatchObject({
      paymentStatus: 'paid',
      paidAmount: 240,
      pointsEarned: 2
    });
    await expect(PaymentModel.findOne({ orderId })).resolves.toMatchObject({
      status: 'paid'
    });
  });

  it('is idempotent for duplicate confirm and does not add points twice', async () => {
    const { token, orderId, userId } = await createMemberOrder();
    await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, transactionId: 'txn-123' });
    const secondResponse = await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, transactionId: 'txn-123' });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.paymentStatus).toBe('paid');
    expect(mockedLinePayClient.confirmPayment).toHaveBeenCalledTimes(1);

    await expect(UserModel.findById(userId)).resolves.toMatchObject({
      points: 2
    });
  });

  it('rejects amount mismatch and does not mark order paid', async () => {
    mockedLinePayClient.confirmPayment.mockResolvedValueOnce({
      transactionId: 'txn-123',
      amount: 200,
      currency: 'TWD',
      rawResponse: { ok: true, amount: 200 }
    });
    const { token, orderId } = await createMemberOrder();
    await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    const response = await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, transactionId: 'txn-123' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    await expect(OrderModel.findById(orderId)).resolves.toMatchObject({
      paymentStatus: 'payment_pending',
      paidAmount: 0
    });
    await expect(PaymentModel.findOne({ orderId })).resolves.toMatchObject({
      status: 'payment_failed'
    });
  });

  it('cancels a payment_pending order and marks it payment_failed', async () => {
    const { token, orderId } = await createMemberOrder();

    await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    const response = await request(app)
      .get(`/api/payments/line-pay/cancel?orderId=${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.paymentStatus).toBe('payment_failed');

    await expect(OrderModel.findById(orderId)).resolves.toMatchObject({
      paymentStatus: 'payment_failed'
    });
  });

  it('rejects cancelling an already paid order', async () => {
    const { token, orderId } = await createMemberOrder();

    await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, transactionId: 'txn-123' });

    const response = await request(app)
      .get(`/api/payments/line-pay/cancel?orderId=${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PAYMENT_REQUEST_NOT_ALLOWED');
  });

  it('allows guest payment request with the guest token', async () => {
    const product = await createProduct();
    const orderResponse = await request(app)
      .post('/api/orders/guest')
      .send({
        guestInfo: {
          name: 'Guest Alice',
          phone: '0912345678'
        },
        items: [{ productId: String(product._id), quantity: 1 }]
      });

    const response = await request(app)
      .post('/api/payments/line-pay/request')
      .set('X-Guest-Token', orderResponse.body.guestToken)
      .send({ orderId: orderResponse.body.id });

    expect(response.status).toBe(201);
    expect(response.body.paymentStatus).toBe('payment_pending');
  });
});
