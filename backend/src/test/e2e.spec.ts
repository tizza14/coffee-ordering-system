import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb';
import { NotificationModel } from '../modules/notifications/notification.model';
import { OrderModel } from '../modules/orders/order.model';
import { PaymentModel } from '../modules/payments/payment.model';
import * as linePayClient from '../modules/payments/linePay.client';
import { ProductModel } from '../modules/products/product.model';
import { UserModel } from '../modules/users/user.model';

jest.mock('../modules/payments/linePay.client');

const mockedLinePayClient = jest.mocked(linePayClient);
const app = createApp();

beforeAll(connectTestDb);
beforeEach(() => {
  jest.resetAllMocks();
  mockedLinePayClient.requestPayment.mockResolvedValue({
    transactionId: 'txn-e2e',
    paymentUrl: 'https://line-pay.example/e2e',
    rawResponse: { ok: true }
  });
});
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function createProduct(input: Partial<{ name: string; price: number; isRedeemable: boolean }> = {}) {
  return ProductModel.create({
    name: input.name ?? 'E2E Latte',
    price: input.price ?? 150,
    category: 'coffee',
    description: 'E2E coffee',
    isAvailable: true,
    isRedeemable: input.isRedeemable ?? false,
    redeemPoints: input.isRedeemable ? 3 : undefined
  });
}

async function createUser(role: 'user' | 'staff' | 'admin', email = `${role}@example.com`) {
  const password = 'password123';
  const user = await UserModel.create({
    name: role,
    email,
    password: await bcrypt.hash(password, 10),
    role,
    points: 0
  });

  const loginResponse = await request(app).post('/api/auth/login').send({ email, password });
  return {
    user,
    token: loginResponse.body.accessToken as string,
    password
  };
}

describe('E2E API flows', () => {
  it('runs member checkout through payment, points, staff status update, and notifications', async () => {
    const product = await createProduct({ price: 150 });
    const { user, token: userToken } = await createUser('user', 'member@example.com');
    const { token: staffToken } = await createUser('staff', 'staff@example.com');
    mockedLinePayClient.confirmPayment.mockResolvedValue({
      transactionId: 'txn-e2e',
      amount: 300,
      currency: 'TWD',
      rawResponse: { ok: true }
    });

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ productId: String(product._id), quantity: 2 }] });

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.totalAmount).toBe(300);

    const paymentRequestResponse = await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: orderResponse.body.id });

    expect(paymentRequestResponse.status).toBe(201);
    expect(paymentRequestResponse.body.paymentStatus).toBe('payment_pending');

    const confirmResponse = await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: orderResponse.body.id, transactionId: 'txn-e2e' });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.paymentStatus).toBe('paid');
    expect(confirmResponse.body.pointsEarned).toBe(3);

    const staffListResponse = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(staffListResponse.status).toBe(200);
    expect(staffListResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: orderResponse.body.id })])
    );

    const acceptResponse = await request(app)
      .patch(`/api/orders/${orderResponse.body.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'accepted' });

    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.status).toBe('accepted');

    const notificationResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(notificationResponse.status).toBe(200);
    expect(notificationResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'order_paid' }),
        expect.objectContaining({ type: 'order_status_updated' })
      ])
    );

    await expect(UserModel.findById(user._id)).resolves.toMatchObject({ points: 3 });
    await expect(OrderModel.findById(orderResponse.body.id)).resolves.toMatchObject({
      paymentStatus: 'paid',
      status: 'accepted',
      paidAmount: 300,
      pointsEarned: 3
    });
    await expect(PaymentModel.findOne({ orderId: orderResponse.body.id })).resolves.toMatchObject({
      status: 'paid',
      amount: 300
    });
    await expect(NotificationModel.countDocuments({ orderId: orderResponse.body.id })).resolves.toBe(
      2
    );
  });

  it('runs guest checkout through token payment and guest notification lookup', async () => {
    const product = await createProduct({ price: 80 });
    mockedLinePayClient.confirmPayment.mockResolvedValue({
      transactionId: 'txn-e2e',
      amount: 80,
      currency: 'TWD',
      rawResponse: { ok: true }
    });

    const orderResponse = await request(app)
      .post('/api/orders/guest')
      .send({
        guestInfo: {
          name: 'Guest Buyer',
          phone: '0912345678',
          email: 'guest@example.com'
        },
        items: [{ productId: String(product._id), quantity: 1 }]
      });

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.orderLookupCode).toEqual(expect.any(String));
    expect(orderResponse.body.guestToken).toEqual(expect.any(String));

    const paymentRequestResponse = await request(app)
      .post('/api/payments/line-pay/request')
      .set('X-Guest-Token', orderResponse.body.guestToken)
      .send({ orderId: orderResponse.body.id });

    expect(paymentRequestResponse.status).toBe(201);

    const confirmResponse = await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('X-Guest-Token', orderResponse.body.guestToken)
      .send({ orderId: orderResponse.body.id, transactionId: 'txn-e2e' });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.paymentStatus).toBe('paid');
    expect(confirmResponse.body.pointsEarned).toBe(0);

    const lookupResponse = await request(app)
      .get(`/api/orders/guest/${orderResponse.body.orderLookupCode}`)
      .set('X-Guest-Token', orderResponse.body.guestToken);

    expect(lookupResponse.status).toBe(200);
    expect(lookupResponse.body.paymentStatus).toBe('paid');

    const notificationResponse = await request(app)
      .get(`/api/notifications/guest/${orderResponse.body.orderLookupCode}`)
      .set('X-Guest-Token', orderResponse.body.guestToken);

    expect(notificationResponse.status).toBe(200);
    expect(notificationResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'order_paid', audience: 'guest' })])
    );
  });

  it('promotes a user to staff and allows access after the promoted user logs in again', async () => {
    const product = await createProduct({ price: 120 });
    const { token: adminToken } = await createUser('admin', 'admin@example.com');
    const promoted = await createUser('user', 'promoted@example.com');

    const initialStaffResponse = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${promoted.token}`);

    expect(initialStaffResponse.status).toBe(403);

    const roleResponse = await request(app)
      .patch(`/api/users/${String(promoted.user._id)}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'staff' });

    expect(roleResponse.status).toBe(200);
    expect(roleResponse.body.role).toBe('staff');

    await OrderModel.create({
      items: [
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1
        }
      ],
      totalAmount: 120,
      paymentStatus: 'paid',
      status: 'pending'
    });

    const reloginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'promoted@example.com', password: promoted.password });

    const staffOrdersResponse = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${reloginResponse.body.accessToken}`);

    expect(staffOrdersResponse.status).toBe(200);
    expect(staffOrdersResponse.body.data).toHaveLength(1);
  });

  it('runs admin product management through create, hidden listing, update, public listing, and delete', async () => {
    const { token: adminToken } = await createUser('admin', 'product-admin@example.com');
    const { token: userToken } = await createUser('user', 'product-user@example.com');

    const forbiddenCreateResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Admin Espresso',
        price: 90,
        category: 'coffee'
      });

    expect(forbiddenCreateResponse.status).toBe(403);

    const createResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Espresso',
        price: 90,
        category: 'coffee',
        description: 'Managed by admin',
        isAvailable: false,
        isRedeemable: true,
        redeemPoints: 3
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      name: 'Admin Espresso',
      price: 90,
      isAvailable: false,
      isRedeemable: true,
      redeemPoints: 3
    });

    const publicHiddenResponse = await request(app).get('/api/products');

    expect(publicHiddenResponse.status).toBe(200);
    expect(publicHiddenResponse.body.data).toHaveLength(0);

    const hiddenListResponse = await request(app).get('/api/products?available=false');

    expect(hiddenListResponse.status).toBe(200);
    expect(hiddenListResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createResponse.body.id })])
    );

    const updateResponse = await request(app)
      .put(`/api/products/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 95, isAvailable: true });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({ price: 95, isAvailable: true });

    const publicCoffeeResponse = await request(app).get('/api/products?category=coffee');

    expect(publicCoffeeResponse.status).toBe(200);
    expect(publicCoffeeResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          name: 'Admin Espresso',
          price: 95
        })
      ])
    );

    const deleteResponse = await request(app)
      .delete(`/api/products/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(204);
    await expect(ProductModel.findById(createResponse.body.id)).resolves.toBeNull();
  });

  it('runs redemption after earned points and returns points when the redeem order is cancelled', async () => {
    const purchaseProduct = await createProduct({ name: 'Point Bundle', price: 300 });
    const redeemProduct = await createProduct({
      name: 'Reward Coffee',
      price: 100,
      isRedeemable: true
    });
    const { user, token } = await createUser('user', 'redeemer@example.com');
    mockedLinePayClient.confirmPayment.mockResolvedValue({
      transactionId: 'txn-e2e',
      amount: 300,
      currency: 'TWD',
      rawResponse: { ok: true }
    });

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: String(purchaseProduct._id), quantity: 1 }] });

    await request(app)
      .post('/api/payments/line-pay/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: orderResponse.body.id });
    await request(app)
      .post('/api/payments/line-pay/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: orderResponse.body.id, transactionId: 'txn-e2e' });

    await expect(UserModel.findById(user._id)).resolves.toMatchObject({ points: 3 });

    const redeemResponse = await request(app)
      .post('/api/orders/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(redeemProduct._id) });

    expect(redeemResponse.status).toBe(201);
    expect(redeemResponse.body).toMatchObject({
      orderType: 'redeem',
      paymentStatus: 'paid',
      pointsRedeemed: 3,
      remainingPoints: 0
    });
    await expect(UserModel.findById(user._id)).resolves.toMatchObject({ points: 0 });

    const cancelResponse = await request(app)
      .patch(`/api/orders/${redeemResponse.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.status).toBe('cancelled');
    await expect(UserModel.findById(user._id)).resolves.toMatchObject({ points: 3 });
    await expect(OrderModel.findById(redeemResponse.body.id)).resolves.toMatchObject({
      status: 'cancelled',
      pointsRedeemed: 0
    });
  });
});
