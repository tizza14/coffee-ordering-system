import { expect, test, type Page } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

const API = 'http://localhost:3000/api';

const buyerUser = {
  id: 'u1',
  name: 'Buyer',
  email: 'buyer@example.com',
  password: 'password123',
  role: 'user' as const,
  points: 3
};

async function loginAsBuyer(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', buyerUser.email);
  await page.fill('input[type="password"]', buyerUser.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/products');
}

test.describe('點數兌換', () => {
  test('兌換後顯示點數去向與後續訂單追蹤入口', async ({ page }) => {
    let currentPoints = 3;
    const redeemedOrder = {
      id: 'redeem-order-1',
      orderLookupCode: 'RDM001',
      status: 'pending',
      paymentStatus: 'paid',
      orderType: 'redeem',
      items: [{ productId: 'p2', name: 'Brownie', price: 0, quantity: 1 }],
      totalAmount: 0,
      paidAmount: 0,
      pointsEarned: 0,
      pointsRedeemed: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...buyerUser, points: currentPoints })
      });
    });
    await page.route(`${API}/points/history`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: currentPoints === 0 ? [{
            orderId: redeemedOrder.id,
            orderLookupCode: redeemedOrder.orderLookupCode,
            orderType: 'redeem',
            delta: -3,
            createdAt: redeemedOrder.createdAt
          }] : []
        })
      });
    });
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: currentPoints === 0 ? [redeemedOrder] : [],
          pagination: { page: 1, limit: 20, total: currentPoints === 0 ? 1 : 0 }
        })
      });
    });
    await page.route(`${API}/orders/redeem`, async (route) => {
      currentPoints = 0;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...redeemedOrder, remainingPoints: 0 })
      });
    });

    await loginAsBuyer(page);
    await page.goto('/points');
    await expect(page.getByText('目前點數')).toBeVisible();
    await page.getByRole('button', { name: '立即兌換' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '確認兌換' }).click();

    await expect(page.getByText('兌換成功', { exact: true })).toBeVisible();
    await expect(page.getByText('已建立兌換訂單 RDM001')).toBeVisible();
    await expect(page.getByText('已扣 3 點')).toBeVisible();
    await expect(page.getByText('剩餘點數')).toBeVisible();
    await expect(page.getByRole('link', { name: '查看兌換訂單狀態' })).toBeVisible();

    await page.getByRole('link', { name: '查看兌換訂單狀態' }).click();
    await expect(page).toHaveURL('/orders/my');
    await expect(page.getByText('RDM001')).toBeVisible();
    await page.getByRole('button', { name: /訂單 RDM001/ }).click();
    await expect(page.getByText('消耗 3 點')).toBeVisible();
    await expect(page.getByText('點數兌換').nth(1)).toBeVisible();
  });
});
