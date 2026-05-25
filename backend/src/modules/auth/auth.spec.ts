import request from 'supertest';
import { createApp } from '../../app';
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} from '../../test/testDb';

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

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123'
    });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'alice@example.com',
      password: 'password456'
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rejects invalid email format', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'not-an-email',
      password: 'password123'
    });

    expect(response.status).toBe(400);
  });

  it('rejects password shorter than 8 characters', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: '123'
    });

    expect(response.status).toBe(400);
  });

  it('rejects login with unknown email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123'
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me returns flat user object without user wrapper', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123'
    });
    const token = registerRes.body.accessToken as string;

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.email).toBe('alice@example.com');
    expect(response.body.role).toBe('user');
    expect(response.body.user).toBeUndefined();
  });
});
