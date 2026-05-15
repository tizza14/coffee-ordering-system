import type { Page } from '@playwright/test';

const API = 'http://localhost:3000/api';

interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'staff' | 'admin';
}

const defaultUsers: MockUser[] = [
  {
    id: 'u1',
    name: 'Buyer',
    email: 'buyer@example.com',
    password: 'password123',
    role: 'user'
  }
];

export async function mockProducts(page: Page) {
  await page.route(`${API}/products**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'p1',
            name: 'Latte',
            price: 120,
            category: 'coffee',
            description: 'Milk coffee',
            isAvailable: true,
            isRedeemable: false,
            redeemPoints: 3
          },
          {
            id: 'p2',
            name: 'Brownie',
            price: 80,
            category: 'dessert',
            description: 'Chocolate dessert',
            isAvailable: true,
            isRedeemable: true,
            redeemPoints: 3
          }
        ],
        pagination: { page: 1, limit: 20, total: 2 }
      })
    });
  });
}

export async function mockAuth(page: Page, users: MockUser[] = defaultUsers) {
  await page.route(`${API}/auth/login`, async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string };
    const user = users.find(
      (item) => item.email === body.email && item.password === body.password
    );

    if (user) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          accessToken: 'mock-token'
        })
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' })
    });
  });

  await page.route(`${API}/auth/register`, async (route) => {
    const body = route.request().postDataJSON() as { name?: string; email?: string };
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u2', name: body.name, email: body.email, role: 'user' },
        accessToken: 'mock-register-token'
      })
    });
  });
}

export async function apiRegister(
  name: string,
  email: string,
  password: string
): Promise<{ accessToken: string }> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  if (!res.ok) throw new Error(`register failed: ${res.status}`);
  return res.json() as Promise<{ accessToken: string }>;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ accessToken: string }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return res.json() as Promise<{ accessToken: string }>;
}

export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token);
}
