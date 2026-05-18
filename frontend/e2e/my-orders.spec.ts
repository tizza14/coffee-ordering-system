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

const staffUser = {
  id: 'staff-1',
  name: 'Staff',
  email: 'staff@example.com',
  password: 'password123',
  role: 'staff' as const
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

    await expect(page.getByText('顯示 8 / 10 筆')).toBeVisible();
    await expect(page.getByText('ORD001')).toBeVisible();
    await expect(page.getByText('ORD008')).toBeVisible();
    await expect(page.getByText('ORD009')).not.toBeVisible();

    await page.getByRole('button', { name: '再顯示 2 筆' }).click();

    await expect(page.getByText('顯示 10 / 10 筆')).toBeVisible();
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

  test('員工進入點餐紀錄時可查看完整訂單', async ({ page }) => {
    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    let requestedAllOrders = false;
    await page.route(`${API}/orders**`, async (route) => {
      requestedAllOrders = new URL(route.request().url()).searchParams.get('all') === 'true';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'guest-order',
              guestInfo: { name: 'Guest', phone: '0912345678' },
              orderLookupCode: 'GUEST01',
              status: 'completed',
              paymentStatus: 'paid',
              orderType: 'purchase',
              items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
              totalAmount: 120,
              paidAmount: 120,
              pointsEarned: 0,
              pointsRedeemed: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'unpaid-order',
              orderLookupCode: 'UNPAID1',
              status: 'pending',
              paymentStatus: 'unpaid',
              orderType: 'purchase',
              items: [{ productId: 'p2', name: 'Brownie', price: 80, quantity: 1 }],
              totalAmount: 80,
              paidAmount: 0,
              pointsEarned: 0,
              pointsRedeemed: 0,
              createdAt: new Date(Date.now() - 60_000).toISOString(),
              updatedAt: new Date(Date.now() - 60_000).toISOString()
            }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        })
      });
    });
    await page.route(`${API}/orders/my**`, async (route) => {
      throw new Error(`staff should not call ${route.request().url()}`);
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: staffUser })
      });
    });

    await loginAs(page, staffUser.email);
    await page.goto('/orders/my');

    expect(requestedAllOrders).toBe(true);
    await expect(page.getByText('查看所有顧客的訂單狀態、付款結果與點餐明細。')).toBeVisible();
    await expect(page.getByText('GUEST01')).toBeVisible();
    await expect(page.getByText('UNPAID1')).toBeVisible();
  });

  test('員工切換成一般使用者後不沿用完整訂單清單', async ({ page }) => {
    await mockAuth(page, [staffUser, buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/orders' && url.searchParams.get('all') === 'true') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'staff-visible-order',
                orderLookupCode: 'ALL001',
                status: 'completed',
                paymentStatus: 'paid',
                orderType: 'purchase',
                items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
                totalAmount: 120,
                paidAmount: 120,
                pointsEarned: 0,
                pointsRedeemed: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            pagination: { page: 1, limit: 20, total: 1 }
          })
        });
        return;
      }

      if (url.pathname === '/api/orders/my') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'buyer-own-order',
                orderLookupCode: 'MINE01',
                status: 'pending',
                paymentStatus: 'paid',
                orderType: 'purchase',
                items: [{ productId: 'p2', name: 'Brownie', price: 80, quantity: 1 }],
                totalAmount: 80,
                paidAmount: 80,
                pointsEarned: 0,
                pointsRedeemed: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            pagination: { page: 1, limit: 20, total: 1 }
          })
        });
        return;
      }

      await route.fallback();
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: buyerUser })
      });
    });

    await loginAs(page, staffUser.email);
    await page.goto('/orders/my');
    await expect(page.getByText('ALL001')).toBeVisible();

    await page.getByRole('button', { name: '登出' }).click();
    await expect(page).toHaveURL('/login');
    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByText('MINE01')).toBeVisible();
    await expect(page.getByText('ALL001')).toHaveCount(0);
    await expect(page.getByText('查看你最近的訂單狀態、付款結果與點餐明細。')).toBeVisible();
  });
});
