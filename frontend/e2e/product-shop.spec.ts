import { expect, test } from '@playwright/test';
import { mockProducts, openNavigation } from './helpers';

test.describe('商品頁', () => {
  test.beforeEach(async ({ page }) => {
    await mockProducts(page);
  });

  test('顯示商品列表與結帳入口', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: '商品' })).toBeVisible();
    await openNavigation(page);
    await expect(
      page.getByRole('navigation').getByRole('link', { name: '結帳' })
    ).toBeVisible();
    await expect(page.getByText('Latte')).toBeVisible();
  });

  test('可依分類篩選商品', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('button', { name: '全部' })).toBeVisible();
    await expect(page.getByRole('button', { name: '咖啡' })).toBeVisible();
    await expect(page.getByRole('button', { name: '甜點' })).toBeVisible();
  });

  test('加入商品後可在購物車看到金額並前往結帳', async ({ page, isMobile }) => {
    await page.goto('/products');
    await page
      .locator('li', { hasText: 'Latte' })
      .getByRole('button', { name: '加入' })
      .click();

    if (isMobile) {
      await expect(page.getByRole('link', { name: '結帳' })).toBeVisible();
      await page.getByRole('button', { name: /購物車/ }).click();
    }

    const visibleCartPanel = page
      .getByTestId('cart-panel')
      .filter({ visible: true });

    await expect(visibleCartPanel.getByText('Latte')).toBeVisible();
    await expect(
      visibleCartPanel.getByTestId('cart-footer').getByText('NT$ 120')
    ).toBeVisible();
  });
});
