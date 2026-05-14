import request from 'supertest';
import { createApp } from '../../app';
import { clearTestDb, connectTestDb, disconnectTestDb } from '../../test/testDb';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('Auth API', () => {
  it('registers a user and returns JWT', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123'
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('alice@example.com');
    expect(response.body.user.role).toBe('user');
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('logs in and returns JWT', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123'
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'password123'
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects invalid password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123'
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'wrong-password'
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });
});
