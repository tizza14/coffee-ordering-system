import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:3000/api';

const staffSession = {
  user: {
    id: 'staff-1',
    name: 'Staff',
    email: 'staff@example.com',
    role: 'staff'
  },
  accessToken: 'mock-token'
};

function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    guestInfo: { name: 'Guest Chen', phone: '0912345678' },
    orderLookupCode: 'ABC123',
    items: [{ productId: 'p1', name: 'Latte', price: 120, quantity: 2 }],
    totalAmount: 240,
    orderType: 'purchase',
    paymentStatus: 'paid',
    status: 'pending',
    paidAmount: 240,
    pointsEarned: 0,
    pointsRedeemed: 0,
    createdAt: '2026-05-22T01:00:00.000Z',
    updatedAt: '2026-05-22T01:00:00.000Z',
    ...overrides
  };
}

async function setStaffSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('coffee-ordering-auth', JSON.stringify(session));
  }, staffSession);
}

async function mockStaffDashboard(page: Page) {
  let orderStatus = 'pending';

  await page.route(`${API}/orders/summary/today`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        date: '2026-05-22',
        timezone: 'Asia/Taipei',
        totalOrders: 4,
        paidOrders: 3,
        paidRevenue: 560,
        averagePaidOrderValue: 187,
        itemQuantity: 6,
        soldItems: [{ productId: 'p1', name: 'Latte', quantity: 4, revenue: 480 }],
        guestOrders: 2,
        memberOrders: 1,
        statusCounts: {
          pending: orderStatus === 'pending' ? 1 : 0,
          accepted: orderStatus === 'accepted' ? 1 : 0,
          preparing: 1,
          ready: 1,
          completed: 1,
          cancelled: 0
        },
        paymentStatusCounts: {
          unpaid: 0,
          payment_pending: 0,
          paid: 3,
          payment_failed: 0,
          refunded: 0
        }
      })
    });
  });

  await page.route(`${API}/orders`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          orderPayload({ id: 'order-2', orderLookupCode: 'READY1', status: 'ready' }),
          orderPayload({ id: 'order-1', orderLookupCode: 'ABC123', status: orderStatus }),
          orderPayload({
            id: 'order-3',
            orderLookupCode: 'MAKE01',
            status: 'preparing',
            createdAt: '2026-05-22T01:30:00.000Z'
          }),
          orderPayload({
            id: 'order-4',
            orderLookupCode: 'DONE01',
            status: 'completed',
            createdAt: '2026-05-22T02:00:00.000Z'
          })
        ]
      })
    });
  });

  await page.route(`${API}/orders/order-1/status`, async (route) => {
    const body = route.request().postDataJSON() as { status: string };
    orderStatus = body.status;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(orderPayload({ status: orderStatus }))
    });
  });
}

test.describe('員工訂單工作台', () => {
  test('依處理佇列顯示摘要並推進訂單狀態', async ({ page }) => {
    await setStaffSession(page);
    await mockStaffDashboard(page);

    await page.goto('/staff/orders');

    await expect(page.getByRole('heading', { name: '員工訂單' })).toBeVisible();
    await expect(page.getByText('NT$ 560')).toBeVisible();
    await expect(page.getByRole('button', { name: /進行中/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: '訂單 ABC123' })).toBeVisible();
    await expect(page.getByText('下一步：確認付款後接單。')).toBeVisible();

    await page.getByRole('button', { name: '接單', exact: true }).click();

    await expect(page.getByText('訂單狀態已更新')).toBeVisible();
    await expect(page.getByText('下一步：開始製作。')).toBeVisible();
    await expect(page.getByRole('button', { name: '開始製作' })).toBeVisible();
  });

  test('可切換可取餐與已結束佇列', async ({ page }) => {
    await setStaffSession(page);
    await mockStaffDashboard(page);

    await page.goto('/staff/orders');

    await page.getByRole('button', { name: /可取餐 1/ }).click();
    await expect(page.getByRole('heading', { name: '訂單 READY1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '訂單 ABC123' })).toHaveCount(0);

    await page.getByRole('button', { name: /已結束/ }).click();
    await expect(page.getByRole('heading', { name: '訂單 DONE01' })).toBeVisible();
    await expect(page.getByText('此訂單已完成。')).toBeVisible();
  });
});
