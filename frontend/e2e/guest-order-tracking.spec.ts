import { expect, test } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

const API = 'http://localhost:3000/api';
const buyerUser = {
  id: 'u1',
  name: 'Buyer',
  email: 'buyer@example.com',
  password: 'password123',
  role: 'user' as const
};

test.describe('訪客訂單追蹤', () => {
  test('頁面顯示查詢表單', async ({ page }) => {
    await page.goto('/orders/guest');

    await expect(page.getByRole('heading', { name: '訂單追蹤' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '輸入訂單資料' })).toBeVisible();
    await expect(page.getByText('訂單查詢碼')).toBeVisible();
    await expect(page.getByText('手機號碼', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '查詢訂單' })).toBeVisible();
    await expect(page.getByText('查詢結果會顯示在這裡')).toBeVisible();
  });

  test('user 登入後顯示自己的訂單查詢碼手機與狀態', async ({ page }) => {
    await mockAuth(page, [buyerUser]);
    await mockProducts(page);
    await page.route(`${API}/orders/my**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'order-1',
              orderLookupCode: 'MEM001',
              guestInfo: { phone: '0912345678' },
              status: 'ready',
              paymentStatus: 'paid',
              orderType: 'purchase',
              items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
              totalAmount: 120,
              paidAmount: 120,
              pointsEarned: 1,
              pointsRedeemed: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: { page: 1, limit: 20, total: 1 }
        })
      });
    });
    await page.route(`${API}/orders/guest/MEM001**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-1',
          orderLookupCode: 'MEM001',
          guestInfo: { phone: '0912345678' },
          status: 'ready',
          paymentStatus: 'paid',
          orderType: 'purchase',
          items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }],
          totalAmount: 120,
          paidAmount: 120,
          pointsEarned: 1,
          pointsRedeemed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    await page.route(`${API}/notifications/guest/MEM001**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });
    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...buyerUser, points: 0 } })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', buyerUser.email);
    await page.fill('input[type="password"]', buyerUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');
    await page.goto('/orders/guest');

    await expect(page.getByRole('heading', { name: '我的近期訂單' })).toBeVisible();
    await expect(page.getByText('訂單 MEM001')).toBeVisible();
    await expect(page.getByText('手機號碼：0912345678')).toBeVisible();
    await expect(page.getByText('可取餐')).toBeVisible();
    await page.getByRole('button', { name: '查詢訂單 MEM001' }).click();
    await expect(page.getByRole('textbox', { name: '訂單查詢碼' })).toHaveValue('MEM001');
    await expect(page.getByRole('textbox', { name: '手機號碼' })).toHaveValue('0912345678');
    await expect(page.getByText('您的餐點已完成，請到櫃檯取餐。')).toBeVisible();
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

    await expect(page.getByText('無此訂單，請確認查詢碼與手機號碼是否正確。')).toBeVisible();
  });

  test('查詢回傳空陣列時顯示無此訂單', async ({ page }) => {
    await page.route(`${API}/orders/guest/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.goto('/orders/guest');
    await page.fill('input:first-of-type', 'EMPTY01');
    await page.fill('input[pattern]', '0999090182');
    await page.getByRole('button', { name: '查詢訂單' }).click();

    await expect(page.getByText('無此訂單，請確認查詢碼與手機號碼是否正確。')).toBeVisible();
    await expect(page.getByText('查詢結果會顯示在這裡')).toBeVisible();
  });

  test('手機號碼不符時顯示無此訂單', async ({ page }) => {
    await page.route(`${API}/orders/guest/**`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'GUEST_LOOKUP_INVALID',
          message: 'Invalid guest lookup information'
        })
      });
    });

    await page.goto('/orders/guest');
    await page.fill('input:first-of-type', '0FDC8A05');
    await page.fill('input[pattern]', '0912312340');
    await page.getByRole('button', { name: '查詢訂單' }).click();

    await expect(page.getByText('無此訂單，請確認查詢碼與手機號碼是否正確。')).toBeVisible();
    await expect(page.getByText('查詢結果會顯示在這裡')).toBeVisible();
  });

  test('手機查詢時不使用既有 guest token 繞過手機驗證', async ({ page }) => {
    await page.route(`${API}/orders/guest/**`, async (route) => {
      expect(route.request().headers()['x-guest-token']).toBeUndefined();
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'GUEST_LOOKUP_INVALID',
          message: 'Invalid guest lookup information'
        })
      });
    });

    await page.goto('/orders/guest?lookupCode=0FDC8A05&phone=0912312340&guestToken=valid-token');

    await expect(page.getByText('無此訂單，請確認查詢碼與手機號碼是否正確。')).toBeVisible();
    await expect(page.getByText('查詢結果會顯示在這裡')).toBeVisible();
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
    await expect(page.getByText('目前已顯示這筆訂單狀態')).toBeVisible();
    await expect(page.getByRole('button', { name: '查詢訂單' })).toHaveCount(0);
    await page.fill('input:first-of-type', 'ABC124');
    await expect(page.getByRole('button', { name: '查詢訂單' })).toBeVisible();
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
