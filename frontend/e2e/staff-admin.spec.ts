import { expect, test } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

test.describe('Route guards: unauthenticated', () => {
  test('redirects /staff/orders to /login when not logged in', async ({ page }) => {
    await page.goto('/staff/orders');
    await expect(page).toHaveURL('/login');
  });

  test('redirects /admin/products to /login when not logged in', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page).toHaveURL('/login');
  });

  test('redirects /admin/users to /login when not logged in', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/login');
  });

  test('allows /orders/my route to render without route-level auth metadata', async ({ page }) => {
    await page.route('**/api/orders/my', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/orders/my');
    await expect(page).toHaveURL('/orders/my');
    await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();
  });
});

test.describe('Authenticated navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockProducts(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');
  });

  test('direct protected staff URL after reload redirects to login without persisted session', async ({ page }) => {
    await page.goto('/staff/orders');
    await expect(page).toHaveURL('/login');
  });

  test('direct protected admin URL after reload redirects to login without persisted session', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/login');
  });

  test('normal user can open my orders through app navigation', async ({ page }) => {
    await page.route('**/api/orders/my', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.getByRole('navigation').getByRole('link', { name: 'My Orders' }).click();
    await expect(page).toHaveURL('/orders/my');
    await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();
  });
});
