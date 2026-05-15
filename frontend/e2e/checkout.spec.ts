import { expect, test } from '@playwright/test';
import { mockProducts } from './helpers';

test.describe('結帳流程', () => {
  test('購物車沒商品時會顯示空狀態', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('購物車沒有商品。')).toBeVisible();
  });

  test('加入商品後可看到訪客結帳表單', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/products');
    await page.locator('li', { hasText: 'Latte' }).getByRole('button', { name: '加入' }).click();
    // SPA navigation preserves cart state
    await page.getByRole('navigation').getByRole('link', { name: '結帳' }).click();
    await expect(page.getByText('姓名')).toBeVisible();
    await expect(page.getByText('手機')).toBeVisible();
  });

  test('訪客訂單查詢頁可正常顯示', async ({ page }) => {
    await page.goto('/orders/guest');
    await expect(page.getByRole('heading', { name: '訪客訂單追蹤' })).toBeVisible();
  });

  test('結帳頁會顯示購物車品項與總計', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/products');
    await page.locator('li', { hasText: 'Latte' }).getByRole('button', { name: '加入' }).click();
    // SPA navigation preserves cart state
    await page.getByRole('navigation').getByRole('link', { name: '結帳' }).click();
    await expect(page.getByText('Latte x 1')).toBeVisible();
    await expect(page.locator('aside footer').getByText('NT$ 120')).toBeVisible();
  });
});
