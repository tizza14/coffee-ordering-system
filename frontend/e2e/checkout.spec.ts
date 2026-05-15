import { expect, test } from '@playwright/test';
import { mockProducts } from './helpers';

test.describe('Checkout', () => {
  test('checkout page shows empty cart message when no items', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Cart is empty.')).toBeVisible();
  });

  test('guest checkout form renders after adding a product', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/products');
    await page.locator('li', { hasText: 'Latte' }).getByRole('button', { name: 'Add' }).click();
    // SPA navigation preserves cart state
    await page.getByRole('navigation').getByRole('link', { name: 'Checkout' }).click();
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Phone')).toBeVisible();
  });

  test('guest order lookup page renders', async ({ page }) => {
    await page.goto('/orders/guest');
    await expect(page.getByRole('heading', { name: '訪客訂單追蹤' })).toBeVisible();
  });

  test('checkout shows cart items and total', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/products');
    await page.locator('li', { hasText: 'Latte' }).getByRole('button', { name: 'Add' }).click();
    // SPA navigation preserves cart state
    await page.getByRole('navigation').getByRole('link', { name: 'Checkout' }).click();
    await expect(page.getByText('Latte x 1')).toBeVisible();
    await expect(page.locator('aside footer').getByText('NT$ 120')).toBeVisible();
  });
});
