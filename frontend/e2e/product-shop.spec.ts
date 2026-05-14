import { expect, test } from '@playwright/test';
import { mockProducts } from './helpers';

test.describe('Product shop', () => {
  test.beforeEach(async ({ page }) => {
    await mockProducts(page);
  });

  test('product list page loads and shows products nav', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('text=Coffee Ordering')).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Checkout' })).toBeVisible();
    await expect(page.getByText('Latte')).toBeVisible();
  });

  test('category filter buttons are present', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Coffee")')).toBeVisible();
    await expect(page.locator('button:has-text("Dessert")')).toBeVisible();
  });

  test('adds a product to the cart', async ({ page }) => {
    await page.goto('/products');
    await page.locator('li', { hasText: 'Latte' }).getByRole('button', { name: 'Add' }).click();
    await expect(page.locator('aside').getByText('Latte')).toBeVisible();
    await expect(page.locator('aside footer').getByText('NT$ 120')).toBeVisible();
  });
});
