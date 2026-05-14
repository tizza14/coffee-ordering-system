import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} from '../../test/testDb';
import { ProductModel } from '../products/product.model';
import { UserModel } from '../users/user.model';
import { OrderModel } from '../orders/order.model';
import * as linePayClient from '../payments/linePay.client';

jest.mock('../payments/linePay.client');
const mockedLinePayClient = jest.mocked(linePayClient);

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function loginAsUser(points = 0) {
  const email = 'point-user@example.com';
  const password = 'password123';
  const user = await UserModel.create({
    name: 'Point User',
    email,
    password: await bcrypt.hash(password, 10),
    role: 'user',
    points
  });
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { token: response.body.accessToken, userId: String(user._id) };
}

describe('Points & Redemption System', () => {
  describe('Point Accumulation (TC-012, TC-015)', () => {
    it('accumulates 2 points for $250 payment (TC-012)', async () => {
      const product = await ProductModel.create({
        name: 'Expensive Coffee',
        price: 250,
        category: 'coffee',
        isAvailable: true
      });
      const { token, userId } = await loginAsUser(0);

      // Create order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId: product._id, quantity: 1 }] });
      const orderId = orderRes.body.id;

      // Mock Line Pay
      mockedLinePayClient.requestPayment.mockResolvedValue({
        transactionId: 'txn-123',
        paymentUrl: 'http://lp.example',
        rawResponse: {}
      });
      mockedLinePayClient.confirmPayment.mockResolvedValue({
        transactionId: 'txn-123',
        amount: 250,
        currency: 'TWD',
        rawResponse: {}
      });

      // Request & Confirm
      await request(app)
        .post('/api/payments/line-pay/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId });
      await request(app)
        .post('/api/payments/line-pay/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId, transactionId: 'txn-123' });

      // Verify points
      const user = await UserModel.findById(userId);
      expect(user?.points).toBe(2);
    });

    it('does not accumulate points for guest (TC-015)', async () => {
      const product = await ProductModel.create({
        name: 'Coffee',
        price: 100,
        category: 'coffee',
        isAvailable: true
      });

      const orderRes = await request(app)
        .post('/api/orders/guest')
        .send({
          guestInfo: { name: 'Guest', phone: '0912345678' },
          items: [{ productId: product._id, quantity: 1 }]
        });
      const orderId = orderRes.body.id;
      const guestToken = orderRes.body.guestToken;

      mockedLinePayClient.requestPayment.mockResolvedValue({
        transactionId: 'txn-guest',
        paymentUrl: 'http://lp.example',
        rawResponse: {}
      });
      mockedLinePayClient.confirmPayment.mockResolvedValue({
        transactionId: 'txn-guest',
        amount: 100,
        currency: 'TWD',
        rawResponse: {}
      });

      await request(app)
        .post('/api/payments/line-pay/request')
        .set('X-Guest-Token', guestToken)
        .send({ orderId });
      await request(app)
        .post('/api/payments/line-pay/confirm')
        .set('X-Guest-Token', guestToken)
        .send({ orderId, transactionId: 'txn-guest' });

      const order = await OrderModel.findById(orderId);
      expect(order?.paymentStatus).toBe('paid');
      expect(order?.pointsEarned).toBe(0);
    });
  });

  describe('Redemption Flow (TC-024, TC-025, TC-026)', () => {
    it('allows user with 3 points to redeem product (TC-024)', async () => {
      const product = await ProductModel.create({
        name: 'Free Coffee',
        price: 100,
        category: 'coffee',
        isAvailable: true,
        isRedeemable: true
      });
      const { token, userId } = await loginAsUser(3);

      const response = await request(app)
        .post('/api/orders/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id });

      expect(response.status).toBe(201);
      expect(response.body.orderType).toBe('redeem');
      expect(response.body.paymentStatus).toBe('paid');
      expect(response.body.totalAmount).toBe(0);

      const user = await UserModel.findById(userId);
      expect(user?.points).toBe(0);
    });

    it('rejects redemption if points are insufficient (TC-025)', async () => {
      const product = await ProductModel.create({
        name: 'Free Coffee',
        price: 100,
        category: 'coffee',
        isAvailable: true,
        isRedeemable: true
      });
      const { token } = await loginAsUser(2);

      const response = await request(app)
        .post('/api/orders/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('POINTS_NOT_ENOUGH');
    });

    it('returns points when redemption order is cancelled', async () => {
      const product = await ProductModel.create({
        name: 'Free Coffee',
        price: 100,
        category: 'coffee',
        isAvailable: true,
        isRedeemable: true
      });
      const { token, userId } = await loginAsUser(3);

      const orderRes = await request(app)
        .post('/api/orders/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id });
      const orderId = orderRes.body.id;

      // Cancel order
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'cancelled' });

      const user = await UserModel.findById(userId);
      expect(user?.points).toBe(3);
    });
  });
});
