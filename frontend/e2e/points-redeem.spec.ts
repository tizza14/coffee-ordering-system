import { expect, test, type Page } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

const API = 'http://localhost:3000/api';

const buyerWith3Points = {
  id: 'u1',
  name: 'Buyer',
  email: 'buyer@example.com',
  password: 'password123',
  role: 'user' as const
};

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/products');
}

function mockRedeemableProducts(page: Page) {
  return page.route(`${API}/products**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'p2',
            name: 'Brownie',
            price: 0,
            category: 'dessert',
            description: 'Chocolate dessert',
            isAvailable: true,
            isRedeemable: true,
            redeemPoints: 3
          }
        ],
        pagination: { page: 1, limit: 20, total: 1 }
      })
    });
  });
}

test.describe('點數兌換', () => {
  test('未登入時導向登入頁', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/points');
    await expect(page).toHaveURL('/login');
  });

  test('顯示目前點數餘額', async ({ page }) => {
    await mockAuth(page, [buyerWith3Points]);
    await mockRedeemableProducts(page);
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...buyerWith3Points, points: 3 })
      });
    });
    await page.route(`${API}/points/history`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    // Use a user with 3 points in the login response
    await page.route(`${API}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u1', name: 'Buyer', email: 'buyer@example.com', role: 'user', points: 3 },
          accessToken: 'mock-token'
        })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', buyerWith3Points.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');

    await page.goto('/points');

    await expect(page.getByRole('heading', { name: '我的點數' })).toBeVisible();
    await expect(page.getByRole('article').getByText('3', { exact: true })).toBeVisible();
  });

  test('點數不足時兌換按鈕為停用狀態', async ({ page }) => {
    await page.route(`${API}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u1', name: 'Buyer', email: 'buyer@example.com', role: 'user', points: 0 },
          accessToken: 'mock-token'
        })
      });
    });
    await mockRedeemableProducts(page);
    await page.route(`${API}/points/history`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', buyerWith3Points.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');

    await page.goto('/points');

    await expect(page.getByRole('button', { name: '立即兌換' })).toBeDisabled();
  });

  test('點數頁顯示可兌換商品', async ({ page }) => {
    await page.route(`${API}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u1', name: 'Buyer', email: 'buyer@example.com', role: 'user', points: 3 },
          accessToken: 'mock-token'
        })
      });
    });
    await mockRedeemableProducts(page);
    await page.route(`${API}/points/history`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', buyerWith3Points.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');

    await page.goto('/points');

    await expect(page.getByText('Brownie')).toBeVisible();
    await expect(page.getByText('3 點兌換')).toBeVisible();
  });
});
