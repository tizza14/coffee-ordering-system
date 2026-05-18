import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} from '../../test/testDb';
import { UserModel } from '../users/user.model';
import { OrderModel } from '../orders/order.model';
import { NotificationModel } from './notification.model';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

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

describe('Notification API', () => {
  it('lists notifications for member', async () => {
    const token = await loginAs('user');
    const userResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    const userId = userResponse.body.user.id;

    await NotificationModel.create({
      userId,
      orderId: new OrderModel()._id,
      audience: 'user',
      type: 'order_status_updated',
      message: 'Test notification'
    });

    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].message).toBe('Test notification');
  });

  it('lists notifications for guest with phone', async () => {
    const order = await OrderModel.create({
      guestInfo: { phone: '0912345678' },
      orderLookupCode: 'GUEST123',
      items: [],
      totalAmount: 0
    });

    await NotificationModel.create({
      guestOrderLookupCode: 'GUEST123',
      orderId: order._id,
      audience: 'guest',
      type: 'order_status_updated',
      message: 'Guest notification'
    });

    const response = await request(app).get(
      '/api/notifications/guest/GUEST123?phone=0912345678'
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].message).toBe('Guest notification');
  });

  it('rejects guest notification access with wrong phone', async () => {
    await OrderModel.create({
      guestInfo: { phone: '0912345678' },
      orderLookupCode: 'GUEST123',
      items: [],
      totalAmount: 0
    });

    const response = await request(app).get(
      '/api/notifications/guest/GUEST123?phone=0987654321'
    );

    expect(response.status).toBe(401);
  });

  it('marks notification as read for member', async () => {
    const token = await loginAs('user');
    const userResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    const userId = userResponse.body.user.id;

    const notif = await NotificationModel.create({
      userId,
      orderId: new OrderModel()._id,
      audience: 'user',
      type: 'order_status_updated',
      message: 'Test notification'
    });

    const response = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.isRead).toBe(true);
  });

  it('marks notification as read for guest', async () => {
    const order = await OrderModel.create({
      guestInfo: { phone: '0912345678' },
      orderLookupCode: 'GUEST123',
      items: [],
      totalAmount: 0
    });

    const notif = await NotificationModel.create({
      guestOrderLookupCode: 'GUEST123',
      orderId: order._id,
      audience: 'guest',
      type: 'order_status_updated',
      message: 'Guest notification'
    });

    const response = await request(app).patch(
      `/api/notifications/${notif._id}/read?lookupCode=GUEST123&phone=0912345678`
    );

    expect(response.status).toBe(200);
    expect(response.body.isRead).toBe(true);
  });

  it('saves push subscription for authenticated user', async () => {
    const token = await loginAs('user');

    const response = await request(app)
      .post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        endpoint: 'https://push.example/sub/1',
        keys: { auth: 'auth-key', p256dh: 'p256dh-key' }
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  it('is idempotent when subscribing twice with same endpoint', async () => {
    const token = await loginAs('user');
    const sub = {
      endpoint: 'https://push.example/sub/1',
      keys: { auth: 'auth-key', p256dh: 'p256dh-key' }
    };

    await request(app)
      .post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(sub);

    const response = await request(app)
      .post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(sub);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  it('removes push subscription for authenticated user', async () => {
    const token = await loginAs('user');
    const endpoint = 'https://push.example/sub/2';

    await request(app)
      .post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint, keys: { auth: 'auth-key', p256dh: 'p256dh-key' } });

    const response = await request(app)
      .delete('/api/notifications/push/unsubscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('returns 404 when unsubscribing non-existent endpoint', async () => {
    const token = await loginAs('user');

    const response = await request(app)
      .delete('/api/notifications/push/unsubscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: 'https://push.example/nonexistent' });

    expect(response.status).toBe(404);
  });

  it('rejects push subscribe without authentication', async () => {
    const response = await request(app)
      .post('/api/notifications/push/subscribe')
      .send({
        endpoint: 'https://push.example/sub/1',
        keys: { auth: 'auth-key', p256dh: 'p256dh-key' }
      });

    expect(response.status).toBe(401);
  });
});
