import { expect, test } from '@playwright/test';
import { mockProducts, openNavigation } from './helpers';

test.describe('商品頁', () => {
  test.beforeEach(async ({ page }) => {
    await mockProducts(page);
  });

  test('商品列表頁可正常顯示導覽與商品', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('text=咖啡點餐系統')).toBeVisible();
    await openNavigation(page);
    await expect(page.getByRole('navigation').getByRole('link', { name: '結帳' })).toBeVisible();
    await expect(page.getByText('Latte')).toBeVisible();
  });

  test('分類篩選按鈕可正常顯示', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('button:has-text("全部")')).toBeVisible();
    await expect(page.locator('button:has-text("咖啡")')).toBeVisible();
    await expect(page.locator('button:has-text("甜點")')).toBeVisible();
  });

  test('可將商品加入購物車', async ({ page, isMobile }) => {
    await page.goto('/products');
    await page.locator('li', { hasText: 'Latte' }).getByRole('button', { name: '加入' }).click();
    if (isMobile) {
      await page.locator('button', { hasText: '購物車' }).click();
    }
    await expect(page.locator('[data-testid="cart-panel"]').getByText('Latte')).toBeVisible();
    await expect(page.locator('[data-testid="cart-panel"] [data-testid="cart-footer"]').getByText('NT$ 120')).toBeVisible();
  });
});
