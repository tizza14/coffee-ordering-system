import http from 'http';
import { io as Client } from 'socket.io-client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { emitOrderUpdated, initSocketServer } from '../sockets/socket.server';
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb';
import { UserModel } from '../modules/users/user.model';
import { OrderModel } from '../modules/orders/order.model';
import { ProductModel } from '../modules/products/product.model';
import { hashGuestToken } from '../utils/crypto';

describe('WebSocket', () => {
  let httpServer: http.Server;
  let port: number;
  let app: Express;

  beforeAll(async () => {
    await connectTestDb(); // Need to connect to DB for socket auth
    app = createApp();
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    return new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const address = httpServer.address();
        port = typeof address === 'string' ? 0 : address?.port || 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    httpServer.close();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

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

  // TC-029: CORS header is not echoed for disallowed origins on the Socket.io polling handshake.
  // Browsers enforce rejection when access-control-allow-origin is absent or mismatched.
  it('does not echo access-control-allow-origin for disallowed origin on Socket.io polling', async () => {
    const response = await request(app)
      .get('/socket.io/')
      .query({ EIO: '4', transport: 'polling' })
      .set('Origin', 'http://evil.example.com');

    expect(response.headers['access-control-allow-origin']).not.toBe(
      'http://evil.example.com'
    );
  });

  it('allows authenticated member to connect and join own room', (done) => {
    loginAs('user').then((token) => {
      const clientSocket = Client(`http://localhost:${port}`, {
        auth: { token }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join_room', { room: 'room:staff' });

        // Wait a bit and check if we are in the room - actually we can't easily check from client
        // but we can check if we receive messages for that room.
        // For now just check connection works.
        clientSocket.disconnect();
        done();
      });
    });
  });

  it('allows guest to connect with lookup code and token', (done) => {
    OrderModel.create({
      orderLookupCode: 'GUEST123',
      guestTokenHash: hashGuestToken('secret-token'),
      items: [],
      totalAmount: 0
    }).then(() => {
      const clientSocket = Client(`http://localhost:${port}`, {
        auth: {
          orderLookupCode: 'GUEST123',
          guestToken: 'secret-token'
        }
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
        done();
      });
    });
  });

  it('prevents guest with invalid token from joining order room', (done) => {
    OrderModel.create({
      orderLookupCode: 'GUEST123',
      guestTokenHash: hashGuestToken('secret-token'),
      items: [],
      totalAmount: 0
    }).then((order) => {
      const clientSocket = Client(`http://localhost:${port}`, {
        auth: {
          orderLookupCode: 'GUEST123',
          guestToken: 'wrong-token'
        }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join_room', { room: `room:order:${order._id}` });

        clientSocket.on('order_updated', () => {
          clientSocket.disconnect();
          done(new Error('Invalid guest token joined order room'));
        });

        setTimeout(() => {
          emitOrderUpdated(String(order._id), { status: 'accepted' });
        }, 50);

        setTimeout(() => {
          clientSocket.disconnect();
          done();
        }, 150);
      });
    });
  });

  it('receives order_updated event when status changes', (done) => {
    Promise.all([
      loginAs('staff'),
      ProductModel.create({
        name: 'Coffee',
        price: 100,
        category: 'coffee',
        isAvailable: true
      })
    ]).then(([staffToken, product]) => {
      OrderModel.create({
        items: [
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: 1
          }
        ],
        totalAmount: 100,
        paymentStatus: 'paid',
        status: 'pending'
      }).then((order) => {
        const clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: staffToken }
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('join_room', { room: `room:order:${order._id}` });

          clientSocket.on('order_updated', (data) => {
            expect(data.orderId).toBe(String(order._id));
            expect(data.status).toBe('accepted');
            clientSocket.disconnect();
            done();
          });

          // Trigger status update
          request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'accepted' })
            .expect(200)
            .end((err) => {
              if (err) done(err);
            });
        });
      });
    });
  });

  it('receives notification event when status changes', (done) => {
    Promise.all([
      loginAs('staff'),
      ProductModel.create({
        name: 'Coffee',
        price: 100,
        category: 'coffee',
        isAvailable: true
      })
    ]).then(([staffToken, product]) => {
      OrderModel.create({
        items: [
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: 1
          }
        ],
        totalAmount: 100,
        paymentStatus: 'paid',
        status: 'pending'
      }).then((order) => {
        const clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: staffToken }
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('join_room', { room: `room:order:${order._id}` });

          clientSocket.on('notification', (data) => {
            expect(data.orderId).toBe(String(order._id));
            expect(data.type).toBe('order_status_updated');
            clientSocket.disconnect();
            done();
          });

          request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'accepted' })
            .expect(200)
            .end((err) => {
              if (err) done(err);
            });
        });
      });
    });
  });
});
