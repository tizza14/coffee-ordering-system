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

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
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
    expect(response.body.orderLookupCode).toEqual(expect.any(String));
    expect(response.body.orderLookupCode).not.toBe(response.body.id);
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

  it('allows guest lookup by order id when phone matches', async () => {
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
      `/api/orders/guest/${createResponse.body.id}?phone=0912345678`
    );

    expect(lookupResponse.status).toBe(200);
    expect(lookupResponse.body.orderLookupCode).toBe(
      createResponse.body.orderLookupCode
    );
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

  it("returns today's customer spending summary for staff", async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const user = await UserModel.create({
      name: 'member',
      email: 'member@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'user'
    });

    await OrderModel.create([
      {
        userId: user._id,
        items: [
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: 2
          }
        ],
        totalAmount: 240,
        paidAmount: 240,
        paymentStatus: 'paid',
        status: 'completed'
      },
      {
        guestInfo: { name: 'Guest', phone: '0912345678' },
        orderLookupCode: 'TODAY001',
        items: [
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: 1
          }
        ],
        totalAmount: 120,
        paidAmount: 120,
        paymentStatus: 'paid',
        status: 'ready'
      },
      {
        guestInfo: { name: 'Unpaid Guest', phone: '0912345679' },
        orderLookupCode: 'TODAY002',
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
      }
    ]);

    const response = await request(app)
      .get('/api/orders/summary/today')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totalOrders).toBe(3);
    expect(response.body.paidOrders).toBe(2);
    expect(response.body.paidRevenue).toBe(360);
    expect(response.body.averagePaidOrderValue).toBe(180);
    expect(response.body.itemQuantity).toBe(3);
    expect(response.body.soldItems).toEqual([
      {
        productId: String(product._id),
        name: 'Latte',
        quantity: 3,
        revenue: 360
      }
    ]);
    expect(response.body.guestOrders).toBe(2);
    expect(response.body.memberOrders).toBe(1);
    expect(response.body.statusCounts).toMatchObject({
      completed: 1,
      ready: 1,
      pending: 1
    });
    expect(response.body.paymentStatusCounts).toMatchObject({
      paid: 2,
      unpaid: 1
    });
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

  it('rejects invalid date format for summary/today', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/summary/today?date=not-a-date')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_DATE');
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

  it('walks an order through the full state transition pending→accepted→preparing→ready→completed', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const order = await OrderModel.create({
      items: [{ productId: product._id, name: product.name, price: product.price, quantity: 1 }],
      totalAmount: 120,
      paymentStatus: 'paid',
      status: 'pending'
    });
    const orderId = String(order._id);

    const transitions: Array<[string, string]> = [
      ['pending', 'accepted'],
      ['accepted', 'preparing'],
      ['preparing', 'ready'],
      ['ready', 'completed']
    ];

    for (const [, toStatus] of transitions) {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: toStatus });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(toStatus);
    }

    const terminalResponse = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'cancelled' });

    expect(terminalResponse.status).toBe(400);
    expect(terminalResponse.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('filters staff orders by status', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const item = { productId: product._id, name: product.name, price: product.price, quantity: 1 };

    await OrderModel.create([
      { items: [item], totalAmount: 120, paymentStatus: 'paid', status: 'pending' },
      { items: [item], totalAmount: 120, paymentStatus: 'paid', status: 'accepted' }
    ]);

    const response = await request(app)
      .get('/api/orders?status=accepted')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe('accepted');
  });

  it('filters staff orders by paymentStatus', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const item = { productId: product._id, name: product.name, price: product.price, quantity: 1 };

    await OrderModel.create([
      { items: [item], totalAmount: 120, paymentStatus: 'paid', status: 'pending' },
      { items: [item], totalAmount: 120, paymentStatus: 'unpaid', status: 'pending' }
    ]);

    const response = await request(app)
      .get('/api/orders?paymentStatus=unpaid')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].paymentStatus).toBe('unpaid');
  });

  it('allows staff to list all orders when all=true', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');
    const item = { productId: product._id, name: product.name, price: product.price, quantity: 1 };

    await OrderModel.create([
      { items: [item], totalAmount: 120, paymentStatus: 'paid', status: 'pending' },
      { items: [item], totalAmount: 120, paymentStatus: 'unpaid', status: 'pending' },
      { items: [item], totalAmount: 120, paymentStatus: 'paid', status: 'completed' }
    ]);

    const response = await request(app)
      .get('/api/orders?all=true')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.pagination.total).toBe(3);
  });
});

describe('Sales report API', () => {
  function taipeiToday() {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  it('returns day report with correct totals', async () => {
    const product = await createProduct();
    const staffToken = await loginAs('staff');

    await OrderModel.create({
      items: [{ productId: product._id, name: product.name, price: product.price, quantity: 2 }],
      totalAmount: 240,
      paidAmount: 240,
      paymentStatus: 'paid',
      status: 'completed'
    });

    const response = await request(app)
      .get(`/api/orders/sales?period=day&date=${taipeiToday()}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('day');
    expect(response.body.totalRevenue).toBe(240);
    expect(response.body.totalOrders).toBe(1);
    expect(response.body.totalItems).toBe(2);
    expect(response.body.breakdown).toHaveLength(1);
    expect(response.body.soldItems).toEqual([
      { productId: String(product._id), name: 'Latte', quantity: 2, revenue: 240 }
    ]);
  });

  it('returns week report with 7 buckets', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get(`/api/orders/sales?period=week&date=${taipeiToday()}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('week');
    expect(response.body.breakdown).toHaveLength(7);
    expect(response.body.totalRevenue).toBe(0);
  });

  it('returns month report with correct bucket count for May', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=month&year=2026&month=5')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('month');
    expect(response.body.breakdown).toHaveLength(31);
  });

  it('returns year report with 12 monthly buckets', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=year&year=2026')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('year');
    expect(response.body.breakdown).toHaveLength(12);
  });

  it('returns range report with one bucket per day', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=range&startDate=2026-05-01&endDate=2026-05-07')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('range');
    expect(response.body.breakdown).toHaveLength(7);
    expect(response.body.label).toBe('2026-05-01 ~ 2026-05-07');
  });

  it('rejects missing or invalid period', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=invalid')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_PERIOD');
  });

  it('rejects range where startDate is after endDate', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=range&startDate=2026-05-10&endDate=2026-05-01')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_DATE_RANGE');
  });

  it('rejects range exceeding 366 days', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=range&startDate=2024-01-01&endDate=2025-05-01')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('DATE_RANGE_TOO_LARGE');
  });

  it('rejects invalid date string format', async () => {
    const staffToken = await loginAs('staff');

    const response = await request(app)
      .get('/api/orders/sales?period=day&date=2026/05/18')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_DATE');
  });

  it('requires staff or admin role', async () => {
    const response = await request(app)
      .get('/api/orders/sales?period=day');

    expect(response.status).toBe(401);
  });
});
