import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} from '../../test/testDb';
import { ProductModel } from './product.model';
import { UserModel } from '../users/user.model';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function loginAs(role: 'user' | 'admin') {
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

describe('Product API', () => {
  it('lists only available products by default', async () => {
    await ProductModel.create([
      {
        name: 'Latte',
        price: 120,
        category: 'coffee',
        description: 'Milk coffee',
        isAvailable: true
      },
      {
        name: 'Hidden Cake',
        price: 90,
        category: 'dessert',
        isAvailable: false
      }
    ]);

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Latte');
  });

  it('filters available products by category', async () => {
    await ProductModel.create([
      {
        name: 'Latte',
        price: 120,
        category: 'coffee',
        isAvailable: true
      },
      {
        name: 'Brownie',
        price: 80,
        category: 'dessert',
        isAvailable: true
      }
    ]);

    const response = await request(app).get('/api/products?category=dessert');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Brownie');
    expect(response.body.pagination.total).toBe(1);
  });

  it('allows admin to create, update, and delete a product', async () => {
    const token = await loginAs('admin');

    const createResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Espresso',
        price: 90,
        category: 'coffee',
        description: 'Strong coffee',
        isRedeemable: true,
        redeemPoints: 3
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe('Espresso');
    expect(createResponse.body.isAvailable).toBe(true);
    expect(createResponse.body.isRedeemable).toBe(true);
    expect(createResponse.body.redeemPoints).toBe(3);

    const updateResponse = await request(app)
      .put(`/api/products/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 95, isAvailable: false });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.price).toBe(95);
    expect(updateResponse.body.isAvailable).toBe(false);

    const deleteResponse = await request(app)
      .delete(`/api/products/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);
    await expect(
      ProductModel.findById(createResponse.body.id)
    ).resolves.toBeNull();
  });

  it('rejects redeemable products with non-fixed redeem points', async () => {
    const token = await loginAs('admin');

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Reward Latte',
        price: 0,
        category: 'coffee',
        isRedeemable: true,
        redeemPoints: 5
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('allows admin to remove a product image', async () => {
    const token = await loginAs('admin');
    const product = await ProductModel.create({
      name: 'Latte',
      price: 120,
      category: 'coffee',
      imageUrl: 'https://example.com/latte.jpg',
      isAvailable: true
    });

    const response = await request(app)
      .delete(`/api/products/${String(product._id)}/image`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.imageUrl).toBe('');
    await expect(ProductModel.findById(product._id)).resolves.toMatchObject({
      imageUrl: ''
    });
  });

  it('rejects non-admin product creation', async () => {
    const token = await loginAs('user');

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Americano',
        price: 100,
        category: 'coffee'
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('AUTH_FORBIDDEN');
  });

  it('rejects unauthenticated product creation', async () => {
    const response = await request(app).post('/api/products').send({
      name: 'Americano',
      price: 100,
      category: 'coffee'
    });

    expect(response.status).toBe(401);
  });
});
