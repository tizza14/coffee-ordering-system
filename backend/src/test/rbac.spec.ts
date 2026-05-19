import request from 'supertest';
import express from 'express';
import { createApp } from '../app';
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb';
import { UserModel } from '../modules/users/user.model';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { errorMiddleware } from '../middlewares/error.middleware';

const app = createApp();
const rbacApp = express();

rbacApp.use(express.json());
rbacApp.get(
  '/staff-only',
  authenticate,
  authorize(['staff', 'admin']),
  (_req, res) => {
    res.json({ message: 'Welcome, staff!' });
  }
);
rbacApp.use(errorMiddleware);

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('Auth & RBAC Middleware', () => {
  const password = 'password123';
  const hashedPassword = bcrypt.hashSync(password, 10);

  it('allows access to /me with valid token', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice',
        email: 'alice@example.com',
        password: password
      });
    const token = registerResponse.body.accessToken;

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('user');
  });

  it('rejects /me without token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejects /me with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });

  it('allows staff to access staff-only route', async () => {
    // Manually create a staff user
    await UserModel.create({
      name: 'Staff User',
      email: 'staff@example.com',
      password: hashedPassword,
      role: 'staff'
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'staff@example.com',
      password: password
    });
    const token = loginResponse.body.accessToken;

    const response = await request(rbacApp)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Welcome, staff!');
  });

  it('denies user access to staff-only route', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice',
        email: 'alice@example.com',
        password: password
      });
    const token = registerResponse.body.accessToken;

    const response = await request(rbacApp)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('AUTH_FORBIDDEN');
  });
});
