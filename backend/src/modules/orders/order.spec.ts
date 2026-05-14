import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { clearTestDb, connectTestDb, disconnectTestDb } from '../../test/testDb';
import { ProductModel } from '../products/product.model';
import { UserModel } from '../users/user.model';
import { OrderModel } from './order.model';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function createProduct() {
  return ProductModel.create({
    name: 'Latte',
    price: 120,
    category: 'coffee',
    description: 'Milk coffee',
    isAvailable: true
  });
}

async function loginAs(role: 'user' | 'staff' | 'admin') {
  const email = `${role}@example.com`;
  const password = 'password123';

  await UserModel.create({
    name: role,
    email,
    password: await bcrypt.hash(password, 10),
    role
  });

  const response = await request(app).post('/api/auth/login').send({ email, password });
  return response.body.accessToken as string;
}

describe('Order API', () => {
  it('creates a member order with backend-calculated total', async () => {
    const product = await createProduct();
    const token = await loginAs('user');

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), quantity: 2 }]
      });

    expect(response.status).toBe(201);
    expect(response.body.userId).toEqual(expect.any(String));
    expect(response.body.totalAmount).toBe(240);
    expect(response.body.paymentStatus).toBe('unpaid');
    expect(response.body.status).toBe('pending');
  });

  it('lists and cancels the current user pending order', async () => {
    const product = await createProduct();
    const token = await loginAs('user');
    const createResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), quantity: 1 }]
      });

    const listResponse = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).toBe(createResponse.body.id);

    const cancelResponse = await request(app)
      .patch(`/api/orders/${createResponse.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.status).toBe('cancelled');
  });

  it('rejects user status updates other than cancelling own pending order', async () => {
    const product = await createProduct();
    const token = await loginAs('user');
    const createResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), quantity: 1 }]
      });

    const response = await request(app)
      .patch(`/api/orders/${createResponse.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ORDER_ACCESS_DENIED');
  });

  it('creates a guest order and allows lookup with phone', async () => {
    const product = await createProduct();

    const createResponse = await request(app)
      .post('/api/orders/guest')
      .send({
        guestInfo: {
          name: 'Guest Alice',
          phone: '0912345678',
          email: 'guest@example.com'
        },
        items: [{ productId: String(product._id), quantity: 1 }]
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.orderLookupCode).toEqual(expect.any(String));
    expect(createResponse.body.guestToken).toEqual(expect.any(String));
    expect(createResponse.body.totalAmount).toBe(120);

    const lookupResponse = await request(app).get(
      `/api/orders/guest/${createResponse.body.orderLookupCode}?phone=0912345678`
    );

    expect(lookupResponse.status).toBe(200);
    expect(lookupResponse.body.id).toBe(createResponse.body.id);
  });

  it('rejects guest lookup with wrong phone', async () => {
    const product = await createProduct();
    const createResponse = await request(app)
      .post('/api/orders/guest')
      .send({
        guestInfo: {
          name: 'Guest Alice',
          phone: '0912345678'
        },
        items: [{ productId: String(product._id), quantity: 1 }]
      });

    const lookupResponse = await request(app).get(
      `/api/orders/guest/${createResponse.body.orderLookupCode}?phone=0987654321`
    );

    expect(lookupResponse.status).toBe(401);
    expect(lookupResponse.body.code).toBe('GUEST_LOOKUP_INVALID');
  });

  it('allows staff to accept a paid pending order', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const order = await OrderModel.create({
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

    const response = await request(app)
      .patch(`/api/orders/${String(order._id)}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('accepted');
  });

  it('rejects accepting an unpaid order', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const order = await OrderModel.create({
      items: [
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1
        }
      ],
      totalAmount: 120,
      paymentStatus: 'unpaid',
      status: 'pending'
    });

    const response = await request(app)
      .patch(`/api/orders/${String(order._id)}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PAYMENT_NOT_PAID');
  });

  it('rejects invalid order status transitions', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const order = await OrderModel.create({
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

    const response = await request(app)
      .patch(`/api/orders/${String(order._id)}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'ready' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_STATUS_TRANSITION');
  });
});
