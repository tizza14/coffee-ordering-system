import { expect, test, type Page } from '@playwright/test';
import { clickNavigationLink, mockAuth, mockProducts } from './helpers';

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

test.describe('未登入路由保護', () => {
  test.beforeEach(async ({ page }) => {
    await mockProducts(page);
  });

  test('未登入時會把 /staff/orders 導向 /login', async ({ page }) => {
    await page.goto('/staff/orders');
    await expect(page).toHaveURL('/login');
  });

  test('未登入時會把 /admin/products 導向 /login', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page).toHaveURL('/login');
  });

  test('未登入時會把 /admin/users 導向 /login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/login');
  });

  test('未登入時會把 /orders/my 導向 /login', async ({ page }) => {
    await page.goto('/orders/my');
    await expect(page).toHaveURL('/login');
  });

  test('訪客導覽不會顯示員工或管理者連結', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('navigation').getByRole('link', { name: '員工' })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '使用者管理' })).toHaveCount(0);
  });
});

test.describe('員工與管理者流程', () => {
  test('員工可查看今日總結並接單', async ({ page }) => {
    let orderStatus = 'pending';

    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    await page.route('**/api/orders/summary/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2026-05-15',
          timezone: 'Asia/Taipei',
          totalOrders: 3,
          paidOrders: 2,
          paidRevenue: 360,
          averagePaidOrderValue: 180,
          itemQuantity: 4,
          soldItems: [{ productId: 'p1', name: 'Latte', quantity: 4, revenue: 480 }],
          guestOrders: 2,
          memberOrders: 1,
          statusCounts: {
            pending: 1,
            accepted: 0,
            preparing: 0,
            ready: 1,
            completed: 1,
            cancelled: 0
          },
          paymentStatusCounts: {
            unpaid: 1,
            payment_pending: 0,
            paid: 2,
            payment_failed: 0,
            refunded: 0
          }
        })
      });
    });
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
    await clickNavigationLink(page, '員工訂單');

    await expect(page).toHaveURL('/staff/orders');
    await expect(page.getByText('今日營收')).toBeVisible();
    await expect(page.getByText('NT$ 360')).toBeVisible();
    await expect(page.getByRole('heading', { name: '訂單 ABC123' })).toBeVisible();
    await expect(page.getByRole('button', { name: '製作中' })).toHaveCount(0);
    await page.getByRole('button', { name: '接單' }).click();
    await expect(page.locator('span').filter({ hasText: /^已接單$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '製作中' })).toBeVisible();
    await expect(page.getByRole('button', { name: '可取餐' })).toHaveCount(0);
  });

  test('管理者可新增、編輯與刪除商品', async ({ page }) => {
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
    await clickNavigationLink(page, '商品管理');

    await expect(page.getByRole('heading', { name: '商品管理' })).toBeVisible();
    await page.getByLabel('商品名稱').fill('Espresso');
    await page.getByLabel('價格').fill('90');
    await page.getByLabel('說明').fill('Strong coffee');
    await page.getByRole('button', { name: '新增' }).click();
    await expect(page.getByRole('heading', { name: 'Espresso' })).toBeVisible();

    await page.getByRole('button', { name: '編輯' }).first().click();
    await page.getByLabel('價格').fill('95');
    await page.getByRole('button', { name: '更新' }).click();
    await expect(page.getByText('NT$ 95')).toBeVisible();

    await page.getByRole('button', { name: '刪除' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '刪除' }).click();
    await expect(page.getByRole('heading', { name: 'Espresso' })).toHaveCount(0);
  });

  test('管理者可檢視使用者並修改角色', async ({ page }) => {
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
    await clickNavigationLink(page, '使用者管理');

    await expect(page.getByRole('heading', { name: '使用者管理' })).toBeVisible();
    await expect(page.getByText('buyer@example.com')).toBeVisible();
    await page.getByRole('combobox').selectOption('staff');
    await expect(page.locator('span').filter({ hasText: /^員工$/ })).toBeVisible();
  });
});

test.describe('已登入導覽', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockProducts(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/products');
  });

  test('一般使用者不會看到員工或管理者連結', async ({ page }) => {
    await expect(page.getByRole('navigation').getByRole('link', { name: '員工' })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: '使用者管理' })).toHaveCount(0);
  });

  test('沒有員工權限時，直接進入員工頁會被導回商品頁', async ({ page }) => {
    await page.goto('/staff/orders');
    await expect(page).toHaveURL('/products');
  });

  test('沒有管理者權限時，直接進入管理頁會被導回商品頁', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/products');
  });

  test('一般使用者可透過導覽進入點餐紀錄', async ({ page }) => {
    await page.route('**/api/orders/my', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await clickNavigationLink(page, '點餐紀錄');
    await expect(page).toHaveURL('/orders/my');
    await expect(page.getByRole('heading', { name: '點餐紀錄' })).toBeVisible();
  });

  test('會員 session 在重新整理後仍存在', async ({ page }) => {
    await page.route('**/api/orders/my', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/orders/my');
    await page.reload();

    await expect(page).toHaveURL('/orders/my');
    await expect(page.getByRole('heading', { name: '點餐紀錄' })).toBeVisible();
  });
});

test.describe('Toast 通知與確認對話框', () => {
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

  async function setupAdminProducts(page: Page) {
    await mockAuth(page, [adminUser]);
    const list = [...products];
    await page.route('**/api/products**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ json: { data: list, pagination: { page: 1, limit: 20, total: list.length } } });
      } else if (method === 'POST') {
        const body = route.request().postDataJSON();
        const created = { id: 'p-new', ...body };
        list.unshift(created);
        await route.fulfill({ status: 201, json: created });
      } else if (method === 'DELETE') {
        list.splice(0, 1);
        await route.fulfill({ status: 204 });
      } else {
        await route.fallback();
      }
    });
    await loginAs(page, 'admin@example.com');
    await clickNavigationLink(page, '商品管理');
    await expect(page.getByRole('heading', { name: '商品管理' })).toBeVisible();
  }

  test('新增商品後顯示成功 Toast', async ({ page }) => {
    await setupAdminProducts(page);
    await page.getByLabel('商品名稱').fill('Espresso');
    await page.getByLabel('價格').fill('90');
    await page.getByRole('button', { name: '新增' }).click();
    await expect(page.getByText('商品已新增')).toBeVisible();
  });

  test('刪除時確認對話框出現，點取消則商品保留', async ({ page }) => {
    await setupAdminProducts(page);
    await page.getByRole('button', { name: '刪除' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('確定要刪除此商品嗎？')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Latte')).toBeVisible();
  });

  test('確認刪除後商品消失並顯示成功 Toast', async ({ page }) => {
    await setupAdminProducts(page);
    await page.getByRole('button', { name: '刪除' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: '刪除' }).click();
    await expect(page.getByText('商品已刪除')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Latte', level: 3 })).toHaveCount(0);
  });

  test('員工接單後顯示成功 Toast', async ({ page }) => {
    await mockAuth(page, [staffUser]);
    await mockProducts(page);
    await page.route('**/api/orders/summary/today', (route) =>
      route.fulfill({ json: { date: '2026-05-18', timezone: 'Asia/Taipei', totalOrders: 1, paidOrders: 1, paidRevenue: 120, averagePaidOrderValue: 120, itemQuantity: 1, soldItems: [{ productId: 'p1', name: 'Latte', quantity: 1, revenue: 120 }], guestOrders: 1, memberOrders: 0, statusCounts: { pending: 1, accepted: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 }, paymentStatusCounts: { unpaid: 0, payment_pending: 0, paid: 1, payment_failed: 0, refunded: 0 } } })
    );
    let status = 'pending';
    await page.route('**/api/orders', async (route) => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      await route.fulfill({ json: { data: [{ id: 'o1', orderLookupCode: 'XYZ', guestInfo: { name: 'Alice', phone: '0900000000' }, items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }], totalAmount: 120, orderType: 'purchase', paymentStatus: 'paid', status, paidAmount: 120, pointsEarned: 0, pointsRedeemed: 0, createdAt: '2026-05-18T01:00:00.000Z', updatedAt: '2026-05-18T01:00:00.000Z' }] } });
    });
    await page.route('**/api/orders/o1/status', async (route) => {
      const body = route.request().postDataJSON() as { status: string };
      status = body.status;
      await route.fulfill({ json: { id: 'o1', orderLookupCode: 'XYZ', guestInfo: { name: 'Alice', phone: '0900000000' }, items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 1 }], totalAmount: 120, orderType: 'purchase', paymentStatus: 'paid', status, paidAmount: 120, pointsEarned: 0, pointsRedeemed: 0, createdAt: '2026-05-18T01:00:00.000Z', updatedAt: '2026-05-18T01:00:00.000Z' } });
    });
    await loginAs(page, 'staff@example.com');
    await clickNavigationLink(page, '員工訂單');
    await page.getByRole('button', { name: '接單' }).click();
    await expect(page.getByText('訂單狀態已更新')).toBeVisible();
  });
});
