import { expect, test } from '@playwright/test';
import { clickLogout, mockAuth, mockProducts, openNavigation } from './helpers';

test.describe('Authentication', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page renders form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('text=姓名')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText('無法使用這組帳密登入。')).toBeVisible();
  });

  test('successful login navigates to products', async ({ page }) => {
    await mockAuth(page);
    await mockProducts(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');
    await expect(page.getByText('Latte')).toBeVisible();
    await openNavigation(page);
    await expect(page.getByRole('navigation').getByRole('link', { name: '登入' })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '註冊' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
  });

  test('logout navigates to login page', async ({ page }) => {
    await mockAuth(page);
    await mockProducts(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');

    await clickLogout(page);

    await expect(page).toHaveURL('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('authenticated user cannot reopen login page', async ({ page }) => {
    await mockAuth(page);
    await mockProducts(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');

    await page.goto('/login');

    await expect(page).toHaveURL('/products');
    await openNavigation(page);
    await expect(page.getByRole('navigation').getByRole('link', { name: '登入' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
  });
});
