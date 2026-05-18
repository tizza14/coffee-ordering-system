import { expect, test, type Page } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

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

const normalUser = {
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

function mockSalesReport(page: Page, overrides: Record<string, unknown> = {}) {
  const base = {
    period: 'day',
    label: '2026-05-18',
    totalRevenue: 480,
    totalOrders: 4,
    totalItems: 6,
    soldItems: [
      { productId: 'p1', name: 'Latte', quantity: 4, revenue: 480 },
      { productId: 'p2', name: 'Brownie', quantity: 2, revenue: 160 }
    ],
    breakdown: [
      { label: '2026-05-18', date: '2026-05-18', revenue: 480, orders: 4, items: 6 }
    ]
  };
  return page.route('**/api/orders/sales**', (route) =>
    route.fulfill({ json: { ...base, ...overrides } })
  );
}

test.describe('銷售報表路由保護', () => {
  test('未登入時 /staff/sales 導向 /login', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/staff/sales');
    await expect(page).toHaveURL('/login');
  });

  test('一般使用者進入 /staff/sales 被導回 /products', async ({ page }) => {
    await mockAuth(page, [normalUser]);
    await mockProducts(page);
    await loginAs(page, 'buyer@example.com');
    await page.goto('/staff/sales');
    await expect(page).toHaveURL('/products');
  });

  test('員工導覽列看得到銷售報表連結', async ({ page }) => {
    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    await loginAs(page, 'staff@example.com');
    await expect(
      page.getByRole('navigation').getByRole('link', { name: '銷售報表' })
    ).toBeVisible();
  });
});

test.describe('銷售報表頁面', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    await mockSalesReport(page);
    await loginAs(page, 'staff@example.com');
    await page.getByRole('navigation').getByRole('link', { name: '銷售報表' }).click();
    await expect(page).toHaveURL('/staff/sales');
    await expect(page.getByText('銷售品項明細')).toBeVisible();
  });

  test('頁面標題與 period 按鈕正確顯示', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '銷售報表' })).toBeVisible();
    for (const label of ['日', '週', '月', '年', '自訂區間']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('日報顯示總營收、品項明細與商品名稱', async ({ page }) => {
    await expect(page.getByText('NT$ 480')).toBeVisible();
    await expect(page.getByText('已付款訂單')).toBeVisible();
    await expect(page.getByText('Latte')).toBeVisible();
  });

  test('切換週報發出正確 API 請求', async ({ page }) => {
    const weekReport = {
      period: 'week',
      label: '2026-05-12 ~ 2026-05-18',
      totalRevenue: 960,
      totalOrders: 8,
      totalItems: 12,
      soldItems: [{ productId: 'p1', name: 'Latte', quantity: 8, revenue: 960 }],
      breakdown: Array.from({ length: 7 }, (_, i) => ({
        label: `5/${12 + i} (${['一','二','三','四','五','六','日'][i]})`,
        date: `2026-05-${String(12 + i).padStart(2, '0')}`,
        revenue: i === 6 ? 480 : 60,
        orders: i === 6 ? 4 : 1,
        items: i === 6 ? 6 : 1
      }))
    };
    await page.route('**/api/orders/sales**', (route) =>
      route.fulfill({ json: weekReport })
    );

    await page.getByRole('button', { name: '週' }).click();
    await expect(page.getByText('NT$ 960')).toBeVisible();
    await expect(page.getByText('每日明細')).toBeVisible();
  });

  test('自訂區間未填日期時查詢按鈕為停用', async ({ page }) => {
    await page.getByRole('button', { name: '自訂區間' }).click();
    await expect(page.getByRole('button', { name: '查詢' })).toBeDisabled();
  });

  test('管理者也可進入銷售報表', async ({ page: _page }) => {
    const page2 = _page;
    await mockAuth(page2, [adminUser]);
    await mockProducts(page2);
    await mockSalesReport(page2);
    await loginAs(page2, 'admin@example.com');
    await page2.getByRole('navigation').getByRole('link', { name: '銷售報表' }).click();
    await expect(page2).toHaveURL('/staff/sales');
    await expect(page2.getByRole('heading', { name: '銷售報表' })).toBeVisible();
  });
});
