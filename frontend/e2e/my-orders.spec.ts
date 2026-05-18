import { expect, test, type Page } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

const API = 'http://localhost:3000/api';

const buyerUser = {
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

test.describe('點餐紀錄', () => {
  test('未登入時導向登入頁', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/orders/my');
    await expect(page).toHaveURL('/login');
  });

  test('登入後無訂單時顯示空狀態', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0 } })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...buyerUser, points: 0 } })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByText('尚無點餐紀錄')).toBeVisible();
    await expect(page.getByRole('link', { name: '前往點餐' })).toBeVisible();
  });

  test('登入後顯示訂單列表', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'order-abc123',
              orderLookupCode: 'ORD001',
              status: 'pending',
              paymentStatus: 'unpaid',
              orderType: 'purchase',
              items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
              totalAmount: 120,
              paidAmount: 0,
              pointsEarned: 0,
              pointsRedeemed: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: { page: 1, limit: 20, total: 1 }
        })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...buyerUser, points: 0 } })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByText('ORD001')).toBeVisible();
  });

  test('訂單很多時先顯示最近 8 筆並可載入更多', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    const now = Date.now();
    const orders = Array.from({ length: 10 }, (_, index) => ({
      id: `order-${index + 1}`,
      orderLookupCode: `ORD${String(index + 1).padStart(3, '0')}`,
      status: 'pending',
      paymentStatus: 'paid',
      orderType: 'purchase',
      items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
      totalAmount: 120,
      paidAmount: 120,
      pointsEarned: 1,
      pointsRedeemed: 0,
      createdAt: new Date(now - index * 60_000).toISOString(),
      updatedAt: new Date(now - index * 60_000).toISOString()
    }));
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: orders,
          pagination: { page: 1, limit: 20, total: orders.length }
        })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...buyerUser, points: 0 } })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByText('最近 8 筆')).toBeVisible();
    await expect(page.getByText('ORD001')).toBeVisible();
    await expect(page.getByText('ORD008')).toBeVisible();
    await expect(page.getByText('ORD009')).not.toBeVisible();

    await page.getByRole('button', { name: '再顯示 2 筆' }).click();

    await expect(page.getByText('最近 10 筆')).toBeVisible();
    await expect(page.getByText('ORD009')).toBeVisible();
    await expect(page.getByText('ORD010')).toBeVisible();
  });

  test('點餐紀錄頁顯示頁面標題', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0 } })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...buyerUser, points: 0 } })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByRole('heading', { name: '點餐紀錄' })).toBeVisible();
  });
});
