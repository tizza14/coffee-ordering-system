import { expect, test, type Page } from '@playwright/test';
import { mockAuth, mockProducts } from './helpers';

const staffUser = {
  id: 'staff-1',
  name: 'Staff',
  email: 'staff@example.com',
  password: 'password123',
  role: 'staff' as const
};

const adminUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  password: 'password123',
  role: 'admin' as const
};

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/products');
}

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

test.describe('Staff and admin workflows', () => {
  test('staff can view paid pending orders and accept an order', async ({ page }) => {
    let orderStatus = 'pending';

    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    await page.route('**/api/orders', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'order-1',
              guestInfo: { name: 'Guest Chen', phone: '0912345678' },
              orderLookupCode: 'ABC123',
              items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 2 }],
              totalAmount: 240,
              orderType: 'purchase',
              paymentStatus: 'paid',
              status: orderStatus,
              paidAmount: 240,
              pointsEarned: 0,
              pointsRedeemed: 0,
              createdAt: '2026-05-14T09:00:00.000Z',
              updatedAt: '2026-05-14T09:00:00.000Z'
            }
          ]
        })
      });
    });
    await page.route('**/api/orders/order-1/status', async (route) => {
      const body = route.request().postDataJSON() as { status: string };
      orderStatus = body.status;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-1',
          guestInfo: { name: 'Guest Chen', phone: '0912345678' },
          orderLookupCode: 'ABC123',
          items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 2 }],
          totalAmount: 240,
          orderType: 'purchase',
          paymentStatus: 'paid',
          status: orderStatus,
          paidAmount: 240,
          pointsEarned: 0,
          pointsRedeemed: 0,
          createdAt: '2026-05-14T09:00:00.000Z',
          updatedAt: '2026-05-14T09:00:00.000Z'
        })
      });
    });

    await loginAs(page, 'staff@example.com');
    await page.getByRole('navigation').getByRole('link', { name: 'Staff' }).click();

    await expect(page).toHaveURL('/staff/orders');
    await expect(page.getByRole('heading', { name: 'Order ABC123' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'preparing' })).toHaveCount(0);
    await page.getByRole('button', { name: 'accepted' }).click();
    await expect(
      page.locator('span').filter({ hasText: /^accepted$/ })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'preparing' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ready' })).toHaveCount(0);
  });

  test('admin can create, edit, and delete products', async ({ page }) => {
    const products = [
      {
        id: 'p1',
        name: 'Latte',
        price: 120,
        category: 'coffee',
        description: 'Milk coffee',
        imageUrl: '',
        isAvailable: true,
        isRedeemable: false,
        redeemPoints: 3
      }
    ];

    await mockAuth(page, [adminUser]);
    await page.route('**/api/products**', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: products,
            pagination: { page: 1, limit: 20, total: products.length }
          })
        });
        return;
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        const product = { id: 'p2', ...body };
        products.unshift(product);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(product)
        });
        return;
      }

      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        const product = { ...products[0], ...body };
        products[0] = product;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(product)
        });
        return;
      }

      products.shift();
      await route.fulfill({ status: 204 });
    });

    await loginAs(page, 'admin@example.com');
    await page.locator('a[href="/admin/products"]').click();

    await expect(page.getByRole('heading', { name: 'Admin Products' })).toBeVisible();
    await page.getByLabel('Name').fill('Espresso');
    await page.getByLabel('Price').fill('90');
    await page.getByLabel('Description').fill('Strong coffee');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'Espresso' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Price').fill('95');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByText('NT$ 95')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('heading', { name: 'Espresso' })).toHaveCount(0);
  });

  test('admin can view users and change a user role', async ({ page }) => {
    let userRole = 'user';

    await mockAuth(page, [adminUser]);
    await mockProducts(page);
    await page.route('**/api/users**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'u1',
                name: 'Buyer',
                email: 'buyer@example.com',
                role: userRole,
                points: 3,
                createdAt: '2026-05-14T09:00:00.000Z'
              }
            ],
            pagination: { page: 1, limit: 20, total: 1 }
          })
        });
        return;
      }

      const body = route.request().postDataJSON() as { role: string };
      userRole = body.role;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u1',
          name: 'Buyer',
          email: 'buyer@example.com',
          role: userRole,
          points: 3,
          createdAt: '2026-05-14T09:00:00.000Z'
        })
      });
    });

    await loginAs(page, 'admin@example.com');
    await page.getByRole('navigation').getByRole('link', { name: 'Users' }).click();

    await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible();
    await expect(page.getByText('buyer@example.com')).toBeVisible();
    await page.getByRole('combobox').selectOption('staff');
    await expect(page.locator('span').filter({ hasText: /^staff$/ })).toBeVisible();
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
