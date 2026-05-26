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

const adminUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  password: 'password123',
  role: 'admin' as const
};

async function loginAs(page: Page, email: string, expectedUrl = '/products') {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(expectedUrl);
}

function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderLookupCode: 'ORD001',
    guestInfo: { phone: '0912345678' },
    status: 'pending',
    paymentStatus: 'paid',
    orderType: 'purchase',
    items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
    totalAmount: 120,
    paidAmount: 120,
    pointsEarned: 1,
    pointsRedeemed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

test.describe('點餐紀錄', () => {
  test('未登入會導向登入頁', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/orders/my');
    await expect(page).toHaveURL('/login');
  });

  test('會員沒有訂單時顯示空狀態', async ({ page }) => {
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
        body: JSON.stringify({ ...buyerUser, points: 0 })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByText('尚無點餐紀錄')).toBeVisible();
    await expect(page.getByRole('link', { name: '前往點餐' })).toBeVisible();
  });

  test('會員可展開歷史訂單並前往追蹤狀態', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [orderPayload()],
          pagination: { page: 1, limit: 20, total: 1 }
        })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...buyerUser, points: 0 })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await expect(page.getByRole('heading', { name: '點餐紀錄' })).toBeVisible();
    await expect(page.getByText('這裡保存完整會員點餐紀錄')).toBeVisible();
    await expect(page.getByText('ORD001')).toBeVisible();
    await page.getByRole('button', { name: /訂單 ORD001/ }).click();
    await expect(page.getByText('訂單查詢碼')).toBeVisible();
    await expect(page.getByText('取餐手機')).toBeVisible();
    await expect(page.getByText('0912345678')).toBeVisible();
    await expect(page.getByRole('link', { name: '追蹤狀態' })).toBeVisible();
  });

  test('會員歷史列表預設顯示前 8 筆並可載入更多', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    const now = Date.now();
    const orders = Array.from({ length: 10 }, (_, index) =>
      orderPayload({
        id: `order-${index + 1}`,
        orderLookupCode: `ORD${String(index + 1).padStart(3, '0')}`,
        createdAt: new Date(now - index * 60_000).toISOString(),
        updatedAt: new Date(now - index * 60_000).toISOString()
      })
    );
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
        body: JSON.stringify({ ...buyerUser, points: 0 })
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

  test('會員可依狀態篩選歷史訂單', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            orderPayload({ id: 'active', orderLookupCode: 'ACTIVE1', status: 'preparing' }),
            orderPayload({ id: 'done', orderLookupCode: 'DONE001', status: 'completed' })
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...buyerUser, points: 0 })
      });
    });

    await loginAs(page, buyerUser.email);
    await page.goto('/orders/my');

    await page.getByRole('button', { name: '已完成 1' }).click();

    await expect(page.getByText('DONE001')).toBeVisible();
    await expect(page.getByText('ACTIVE1')).toHaveCount(0);
  });

  test('admin 進入點餐紀錄時可查看完整訂單', async ({ page }) => {
    await mockAuth(page, [adminUser]);
    await mockProducts(page);
    let requestedAllOrders = false;
    const ordersBody = JSON.stringify({
      data: [
        orderPayload({
          id: 'guest-order',
          guestInfo: { name: 'Guest', phone: '0912345678' },
          orderLookupCode: 'GUEST01',
          status: 'completed',
          pointsEarned: 0
        }),
        orderPayload({
          id: 'unpaid-order',
          orderLookupCode: 'UNPAID1',
          status: 'pending',
          paymentStatus: 'unpaid',
          totalAmount: 80,
          paidAmount: 0,
          pointsEarned: 0
        })
      ],
      pagination: { page: 1, limit: 20, total: 2 }
    });
    await page.route(`${API}/orders**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/orders/summary/today') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            timezone: 'Asia/Taipei',
            totalOrders: 0, paidOrders: 0, paidRevenue: 0,
            averagePaidOrderValue: 0, itemQuantity: 0, soldItems: [],
            guestOrders: 0, memberOrders: 0,
            statusCounts: { pending: 0, accepted: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 },
            paymentStatusCounts: { unpaid: 0, payment_pending: 0, paid: 0, payment_failed: 0, refunded: 0 }
          })
        });
        return;
      }
      if (url.pathname === '/api/orders') {
        requestedAllOrders = url.searchParams.get('all') === 'true';
        await route.fulfill({ status: 200, contentType: 'application/json', body: ordersBody });
        return;
      }
      await route.fallback();
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(adminUser)
      });
    });

    await loginAs(page, adminUser.email, '/staff/orders');
    await page.goto('/orders/my');

    await expect.poll(() => requestedAllOrders).toBe(true);
    await expect(page.getByText('完整訂單歷史列表')).toBeVisible();
    await expect(page.getByText('GUEST01')).toBeVisible();
    await expect(page.getByText('UNPAID1')).toBeVisible();
  });
});
