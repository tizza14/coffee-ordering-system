import { expect, test, type Page } from '@playwright/test';
import { mockAuth, mockProducts, openNavigation } from './helpers';

const API = 'http://localhost:3000/api';

const staffUser = {
  id: 'staff-1',
  name: 'Staff',
  email: 'staff@example.com',
  password: 'password123',
  role: 'staff' as const
};

const adminUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  password: 'password123',
  role: 'admin' as const
};

async function mockStaffOrders(page: Page) {
  await page.route(`${API}/orders/summary/today`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        date: '2026-05-22',
        timezone: 'Asia/Taipei',
        totalOrders: 0,
        paidOrders: 0,
        paidRevenue: 0,
        averagePaidOrderValue: 0,
        itemQuantity: 0,
        soldItems: [],
        guestOrders: 0,
        memberOrders: 0,
        statusCounts: {
          pending: 0,
          accepted: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
          cancelled: 0
        },
        paymentStatusCounts: {
          unpaid: 0,
          payment_pending: 0,
          paid: 0,
          payment_failed: 0,
          refunded: 0
        }
      })
    });
  });

  await page.route(`${API}/orders`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
}

test.describe('角色導覽入口', () => {
  test('staff 登入後直接進入員工訂單，且不能回到顧客購物頁', async ({ page }) => {
    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    await mockStaffOrders(page);

    await login(page, staffUser.email);

    await expect(page).toHaveURL('/staff/orders');
    await expect(page.getByRole('heading', { name: '員工訂單' })).toBeVisible();
    await openNavigation(page);
    await expect(page.getByRole('navigation').getByRole('link', { name: '商品' })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '結帳' })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '員工訂單' })).toBeVisible();

    await page.goto('/products');
    await expect(page).toHaveURL('/staff/orders');
  });

  test('admin 登入後進入員工訂單，導覽列只顯示管理功能', async ({ page }) => {
    await mockAuth(page, [adminUser]);
    await mockProducts(page);
    await mockStaffOrders(page);

    await login(page, adminUser.email);

    await expect(page).toHaveURL('/staff/orders');
    await openNavigation(page);
    await expect(page.getByRole('navigation').getByRole('link', { name: '商品', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '點餐紀錄' })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '員工訂單' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: '銷售報表' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: '商品管理' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: '使用者管理' })).toBeVisible();
  });
});
