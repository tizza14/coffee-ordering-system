import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} from '../../test/testDb';
import { UserModel } from './user.model';

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

describe('User API', () => {
  it('admin can list all users', async () => {
    const adminToken = await loginAs('admin');
    await UserModel.create([
      {
        name: 'Alice',
        email: 'alice@example.com',
        password: 'x',
        role: 'user',
        points: 5
      },
      {
        name: 'Bob',
        email: 'bob@example.com',
        password: 'x',
        role: 'staff',
        points: 0
      }
    ]);

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    // 3 total: admin + alice + bob
    expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    expect(response.body.data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      points: expect.any(Number)
    });
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it('non-admin cannot list users', async () => {
    const userToken = await loginAs('user');

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });

  it('unauthenticated request cannot list users', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(401);
  });

  it('admin can update a user role', async () => {
    const adminToken = await loginAs('admin');
    const target = await UserModel.create({
      name: 'Target',
      email: 'target@example.com',
      password: 'x',
      role: 'user'
    });

    const response = await request(app)
      .patch(`/api/users/${target._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'staff' });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('staff');
  });

  it('rejects invalid role value', async () => {
    const adminToken = await loginAs('admin');
    const target = await UserModel.create({
      name: 'Target',
      email: 'target2@example.com',
      password: 'x',
      role: 'user'
    });

    const response = await request(app)
      .patch(`/api/users/${target._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superuser' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for unknown user id', async () => {
    const adminToken = await loginAs('admin');

    const response = await request(app)
      .patch('/api/users/000000000000000000000001/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'staff' });

    expect(response.status).toBe(404);
  });

  it('non-admin cannot update user role', async () => {
    const staffToken = await loginAs('staff');
    const target = await UserModel.create({
      name: 'Target',
      email: 'target3@example.com',
      password: 'x',
      role: 'user'
    });

    const response = await request(app)
      .patch(`/api/users/${target._id}/role`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(403);
  });
});
