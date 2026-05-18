import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.describe('訪客訂單追蹤', () => {
  test('頁面顯示查詢表單', async ({ page }) => {
    await page.goto('/orders/guest');

    await expect(page.getByRole('heading', { name: '訪客訂單追蹤' })).toBeVisible();
    await expect(page.getByText('訂單查詢碼')).toBeVisible();
    await expect(page.getByText('手機號碼', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '查詢訂單' })).toBeVisible();
  });

  test('查詢碼不存在時顯示錯誤訊息', async ({ page }) => {
    await page.route(`${API}/orders/guest/**`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'ORDER_NOT_FOUND', message: 'Order not found' })
      });
    });

    await page.goto('/orders/guest');
    await page.fill('input:first-of-type', 'BADCODE');
    await page.fill('input[pattern]', '0912345678');
    await page.getByRole('button', { name: '查詢訂單' }).click();

    await expect(page.locator('p.text-red-700')).toBeVisible();
  });

  test('查詢成功後顯示訂單狀態', async ({ page }) => {
    await page.route(`${API}/orders/guest/ABC123**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-1',
          orderLookupCode: 'ABC123',
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
        })
      });
    });
    await page.route(`${API}/notifications/guest/ABC123**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.goto('/orders/guest');
    await page.fill('input:first-of-type', 'ABC123');
    await page.fill('input[pattern]', '0912345678');
    await page.getByRole('button', { name: '查詢訂單' }).click();

    await expect(page.getByText('ABC123')).toBeVisible();
  });

  test('通知紀錄 404 時仍顯示訂單資料', async ({ page }) => {
    await page.route(`${API}/orders/guest/ABC123**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-1',
          orderLookupCode: 'ABC123',
          status: 'pending',
          paymentStatus: 'paid',
          orderType: 'purchase',
          items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
          totalAmount: 120,
          paidAmount: 120,
          pointsEarned: 0,
          pointsRedeemed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    await page.route(`${API}/notifications/guest/ABC123**`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'RESOURCE_NOT_FOUND', message: 'Not found' })
      });
    });

    await page.goto('/orders/guest');
    await page.fill('input:first-of-type', 'ABC123');
    await page.fill('input[pattern]', '0912345678');
    await page.getByRole('button', { name: '查詢訂單' }).click();

    await expect(page.getByText('ABC123')).toBeVisible();
    await expect(page.locator('p.text-red-700')).toHaveCount(0);
  });

  test('查詢碼會自動去空白並轉大寫', async ({ page }) => {
    await page.route(`${API}/orders/guest/ABC123**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-1',
          orderLookupCode: 'ABC123',
          status: 'ready',
          paymentStatus: 'paid',
          orderType: 'purchase',
          items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
          totalAmount: 120,
          paidAmount: 120,
          pointsEarned: 0,
          pointsRedeemed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    await page.route(`${API}/notifications/guest/ABC123**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.goto('/orders/guest');
    await page.fill('input:first-of-type', ' abc123 ');
    await page.fill('input[pattern]', '0912345678');
    await page.getByRole('button', { name: '查詢訂單' }).click();

    await expect(page.getByText('ABC123')).toBeVisible();
    await expect(page.getByText('您的餐點已完成，請到櫃檯取餐。')).toBeVisible();
  });

});
