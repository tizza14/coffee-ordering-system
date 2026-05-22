import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.describe('付款確認', () => {
  test('付款確認失敗時可重新付款或查看追蹤', async ({ page }) => {
    await page.route(`${API}/payments/line-pay/confirm`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PAYMENT_AMOUNT_MISMATCH',
          message: 'Payment amount mismatch'
        })
      });
    });
    await page.route(`${API}/payments/line-pay/request`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentUrl: 'http://localhost:5173/mock-line-pay',
          transactionId: 'txn-retry',
          paymentStatus: 'payment_pending'
        })
      });
    });

    await page.goto(
      '/payments/line-pay/confirm?orderId=o1&transactionId=txn-1&lookupCode=ABC123'
    );

    await expect(page.getByRole('heading', { name: '付款失敗' })).toBeVisible();
    await expect(page.getByText('錯誤代碼：PAYMENT_AMOUNT_MISMATCH')).toBeVisible();
    await expect(page.getByRole('button', { name: '重新付款' })).toBeVisible();
    await expect(page.getByRole('link', { name: '查看訂單追蹤' })).toBeVisible();

    await page.getByRole('button', { name: '重新付款' }).click();

    await expect(page).toHaveURL(/\/mock-line-pay$/);
  });
});
