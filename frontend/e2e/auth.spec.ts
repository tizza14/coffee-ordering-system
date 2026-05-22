import { expect, test } from '@playwright/test';
import { clickLogout, mockAuth, mockProducts, openNavigation } from './helpers';

test.describe('登入與註冊', () => {
  test('登入頁顯示表單與訪客入口', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: '登入' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '登入' })).toBeVisible();
    await expect(page.getByRole('link', { name: '建立會員帳號' })).toBeVisible();
    await expect(page.getByRole('link', { name: '先以訪客身分瀏覽商品' })).toBeVisible();
  });

  test('註冊頁顯示表單與登入入口', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: '註冊' })).toBeVisible();
    await expect(page.locator('input[autocomplete="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '註冊' })).toBeVisible();
    await expect(page.getByRole('link', { name: '前往登入' })).toBeVisible();
    await expect(page.getByRole('link', { name: '先以訪客身分瀏覽商品' })).toBeVisible();
  });

  test('登入失敗時顯示錯誤訊息', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText('無法使用這組帳密登入。')).toBeVisible();
  });

  test('一般會員登入後進入商品頁並隱藏登入註冊入口', async ({ page }) => {
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

  test('登出後回到登入頁', async ({ page }) => {
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

  test('已登入會員不能重新開啟登入頁', async ({ page }) => {
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
