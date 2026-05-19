# Development Progress

Last updated: 2026-05-18 +08:00 (rev 6)

This is the single source of truth for project progress. Keep future updates in this file instead of creating separate `PROGRESS_*.md` files.

## Overall Status

Backend core features are implemented through product listing/admin CRUD, authentication/RBAC, order creation/tracking, Line Pay flow, WebSocket notifications, member points, and redemption orders.

Frontend features are implemented through shop/auth/cart, checkout, payment confirmation, member order history, guest tracking, staff order handling, and admin product management.

All planned feature specs through `FS-016` now have an implemented and verified path. Backend API E2E and frontend browser smoke E2E are accepted. Frontend RWD baseline has been added and verified on desktop and mobile Playwright projects.

All planned feature specs through `FS-016` are implemented, tested, and deployed. CI Pipeline, containerization, Swagger API documentation, cloud deployment, demo seed, and product imageUrl are all complete. Project is fully shipped.

**Live URLs:**
- Frontend: https://coffee-ordering-system-delta.vercel.app
- Backend: https://coffee-ordering-system-60aw.onrender.com
- Swagger: https://coffee-ordering-system-60aw.onrender.com/api-docs

→ 部署步驟見 [deploy/RENDER_VERCEL.md](deploy/RENDER_VERCEL.md)

## Backend Progress

### Auth / RBAC

Status: Accepted

Implemented:

- Register and login APIs.
- JWT authentication middleware.
- Express `Request.user` type extension.
- RBAC middleware through `authorize(roles[])`.
- `/api/auth/me` authenticated user verification.
- Removed temporary production `/api/auth/staff-only` route.
- RBAC tests now mount a test-only route instead of exposing a verification endpoint in product code.

Verified:

- `TC-017`: register returns user and JWT.
- `TC-018`: login returns JWT.
- `TC-019`: invalid password returns 401.
- Valid token can access `/me`.
- Missing or invalid token returns 401.
- Staff-only middleware allows staff and rejects normal users.

### Product / Admin Product

Status: Accepted

Traceability:

- `FS-001`: Accepted
- `FS-012`: Accepted

Implemented:

- `ProductModel` with name, price, category, description, availability, redeemable flag, and redeem points.
- Public product list API: `GET /api/products`.
- Admin-only product APIs:
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- Product validators.
- Admin API protection with `authenticate` and `authorize(['admin'])`.
- Fixed redeem cost rule: `redeemPoints = 3`.

Verified:

- `TC-001`: public product list only returns available products by default.
- Category filtering.
- Admin create/update/delete product.
- Redeemable products expose `isRedeemable` and fixed `redeemPoints = 3`.
- Non-fixed redeem points are rejected.
- `TC-011`: non-admin product creation returns 403.
- Unauthenticated product creation returns 401.

### Order / Guest Order

Status: Accepted

Traceability:

- `FS-005`: Accepted
- `FS-006`: Accepted
- `FS-009`: Tested, integrated with notification work under `FS-010`

Implemented:

- `OrderModel` with member/guest fields, guest lookup code, guest token hash, payment status, order status, and indexes.
- Order APIs:
  - `POST /api/orders`
  - `POST /api/orders/guest`
  - `GET /api/orders/guest/:lookupCode`
  - `GET /api/orders/my`
  - `GET /api/orders`
  - `PATCH /api/orders/:id/status`
  - `POST /api/orders/redeem`
- Backend-calculated order totals from product prices.
- Guest `orderLookupCode` and one-time `guestToken` response with hashed token storage.
- Guest lookup by phone or `X-Guest-Token`.
- Member order listing and member cancellation of own pending orders.
- Staff/admin order status transition rules.
- Guards for unpaid order acceptance and invalid status transitions.

Verified:

- `TC-002`: guest order creation.
- `TC-003`: member order creation.
- `TC-007`: staff accepts paid pending order.
- `TC-008`: staff rejects unpaid order.
- `TC-010`: guest lookup flow.
- `TC-013`: order status transition rules.

### Payment / Line Pay

Status: Accepted

Traceability:

- `FS-007`: Accepted
- `FS-008`: Accepted

Implemented:

- `PaymentModel` with provider, transaction ID, merchant order ID, amount, currency, status, raw request/response, and confirmed timestamp.
- Mockable Line Pay client with request/confirm calls and HMAC-SHA256 signature generation.
- Payment APIs:
  - `POST /api/payments/line-pay/request`
  - `POST /api/payments/line-pay/confirm`
- Line Pay environment settings in `backend/.env.example`.
- Payment request rules:
  - User must own member order.
  - Guest must provide matching `X-Guest-Token`.
  - Only `purchase` orders with `unpaid` or `payment_failed` can start payment.
  - Order moves to `payment_pending`.
  - Payment record is created.
- Confirm rules:
  - Confirm validates transaction/order ownership.
  - Successful confirm moves Payment and Order to `paid`.
  - Confirm is idempotent.
  - Duplicate confirm does not call Line Pay again or add points twice.
  - Amount mismatch marks Payment `payment_failed` and leaves Order unpaid.

Verified:

- `TC-004`: Line Pay request creates payment and updates status.
- `TC-005`: Line Pay confirm updates payment/order status.
- `TC-006`: duplicate confirm idempotency.
- `TC-014`: amount mismatch rejection.

### Notification / WebSocket

Status: Accepted

Traceability:

- `FS-010`: Accepted
- `FS-014`: Accepted

Implemented:

- Notification model, service, controller, and routes.
- Notification history APIs:
  - `GET /api/notifications`
  - `GET /api/notifications/guest/:lookupCode`
  - `PATCH /api/notifications/:id/read`
- Socket.io server.
- Socket authentication for JWT users and guest lookup/token.
- Order room authorization:
  - Staff/admin can join order rooms.
  - Users can join only owned order rooms.
  - Guests can join only with correct lookup code and guest token.
- Status updates create Notification records.
- Status updates emit both `order_updated` and `notification`.

Verified:

- `TC-009`: status update emits `order_updated`.
- `TC-020`: guest with invalid token cannot join order room.
- `TC-021`: guest with correct lookup information can get notification history.
- `TC-022`: guest with wrong phone cannot get notification history.
- `TC-023`: status update creates Notification and emits `notification`.

### Points / Redemption

Status: Accepted

Traceability:

- `FS-011`: Accepted
- `FS-015`: Accepted

Implemented:

- Point service behavior:
  - `calculateEarnedPoints(amount)`
  - `earnPoints(userId, points)`
  - `deductPointsForRedemption(userId)`
  - `returnPoints(userId, points)`
- Payment confirm uses point service for member purchase point earning.
- Confirm idempotency preserves one-time point addition.
- Guest payment confirm keeps `pointsEarned = 0`.
- Redeem orders:
  - Require authenticated `user` role.
  - Require redeemable product.
  - Require `User.points >= 3`.
  - Deduct 3 points atomically.
  - Create `orderType = redeem`.
  - Set `paymentStatus = paid`.
  - Set `pointsRedeemed = 3`.
  - Skip Line Pay flow.
- Cancelling a pending redeem order returns redeemed points and clears `pointsRedeemed`.

Verified:

- `TC-012`: accumulate 2 points for 250 payment.
- `TC-015`: guest payment does not earn points.
- `TC-024`: user with 3 points can redeem product.
- `TC-025`: user with fewer than 3 points cannot redeem.
- `TC-026`: redemption orders do not earn points.

### User Management

Status: Accepted

Traceability:

- `FS-013`: Accepted

Implemented:

- Admin user list API: `GET /api/users`.
- Admin user role update API: `PATCH /api/users/:id/role`.
- Admin-only protection with `authenticate` and `authorize(['admin'])`.
- Role validation for `user`, `staff`, and `admin`.
- Paginated user list response with user id, name, email, role, points, and created timestamp.

Verified:

- Admin can list all users.
- Non-admin users cannot list users.
- Unauthenticated requests cannot list users.
- Admin can update a user role.
- Invalid role values return `400 VALIDATION_ERROR`.
- Unknown user id returns 404.
- Non-admin users cannot update roles.

## E2E / Integration Hardening

Status: Accepted

Added backend cross-module E2E coverage in `backend/src/test/e2e.spec.ts`:

- Member checkout flow:
  - member order creation
  - Line Pay request
  - Line Pay confirm
  - member point earning
  - staff order list visibility
  - staff status update
  - member notification history
  - persisted Order, Payment, User, and Notification state checks
- Guest checkout flow:
  - guest order creation
  - guest-token Line Pay request
  - guest-token Line Pay confirm
  - guest order lookup
  - guest notification lookup
  - no member point earning
- Admin role management flow:
  - normal user cannot access staff order list
  - admin promotes user to staff
  - promoted user logs in again and can access staff order list
- Admin product management flow:
  - normal user cannot create products
  - admin creates a hidden redeemable product
  - hidden product is excluded from default public list
  - unavailable product list can show the hidden product
  - admin updates price and availability
  - updated product appears in public category list
  - admin deletes the product
- Redemption cancellation flow:
  - member earns 3 points through paid purchase
  - member redeems a reward product
  - redeem order deducts 3 points
  - cancelling the pending redeem order returns the 3 points
  - redeem order clears `pointsRedeemed` after cancellation

## Frontend Progress

### Shop / Auth / Cart

Status: Accepted

Traceability:

- `FS-001`: Accepted
- `FS-002`: Accepted
- `FS-003`: Accepted
- `FS-004`: Accepted

Implemented:

- Tailwind CSS v4 through `@tailwindcss/vite`.
- `frontend/src/tailwind.css` imported in `main.ts`.
- Auth API wrapper.
- Auth store login/register/logout actions.
- Axios bearer token request interceptor.
- Routes and views:
  - `/products`
  - `/login`
  - `/register`
- App header navigation and logout action.
- Product list reworked into a shop screen with:
  - product loading
  - category filtering
  - redeemable product badge
  - add-to-cart
  - cart panel
  - increment/decrement/remove/clear cart
  - total amount

Verified:

- Auth store login/register/logout.
- Cart add/update/increment/decrement/remove.
- Product list loading and category filtering.
- Add-to-cart integration from product list.

### Checkout / Orders / Guest Tracking

Status: Accepted

Traceability:

- `FS-005`: Accepted
- `FS-006`: Accepted
- `FS-007`: Accepted
- `FS-008`: Accepted
- `FS-010`: Accepted
- `FS-014`: Accepted

Implemented:

- Order API client for member orders, guest orders, member order list, and guest lookup.
- Payment API client for Line Pay request and confirm.
- Notification API client for member/guest notification history and mark-read.
- Pinia stores:
  - `order.store.ts`
  - `payment.store.ts`
  - `notification.store.ts`
  - `socket.store.ts`
- Routes and views:
  - `/checkout`
  - `/orders/my`
  - `/orders/guest`
  - `/payments/line-pay/confirm`
- Member and guest checkout flow from cart items.
- Line Pay redirect request and confirm page.
- Member order history screen.
- Guest order tracking by lookup code, phone, and guest token.
- Guest notification history display.
- Socket.io client connection, order room join, `order_updated`, and `notification` handling.

Verified:

- Order store flows.
- Payment store flows.
- Notification store flows.
- Product list tests updated for checkout navigation.

### Staff / Admin

Status: Accepted

Traceability:

- `FS-009`: Accepted
- `FS-012`: Accepted
- `FS-013`: Accepted

Implemented:

- Staff/admin API methods:
  - `GET /api/orders`
  - `PATCH /api/orders/:id/status`
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
  - `GET /api/products?available=false`
- `order.store.ts` staff order list and status update behavior.
- `product-admin.store.ts` admin product CRUD behavior.
- Route role metadata and navigation guard helpers.
- Guarded routes:
  - `/staff/orders`
  - `/admin/products`
- Staff order management UI.
- Admin product management UI.
- Admin user management UI.
- Staff/admin navigation links based on signed-in role.

Verified:

- Route guard role helpers.
- Staff order store loading/status update.
- Admin product store CRUD.
- Admin user store loading and role update.
- Playwright staff order workflow: staff logs in, opens paid pending orders, and accepts an order.
- Playwright admin product workflow: admin creates, edits, and deletes a product.
- Playwright admin user workflow: admin views users and changes a user role.

### Sales Report

Status: Accepted

Implemented:

- Backend service additions in `order.service.ts`:
  - Taipei timezone helpers: `TAIPEI_OFFSET_MS`, `taipeiMidnightUTC(year, month, day)`
  - `getTaipeiDayRange` accepts optional `dateStr` parameter for historical date queries
  - `getWeekBuckets`, `getMonthBuckets`, `getYearBuckets`, `getCustomRangeBuckets` for time bucketing
  - `getSalesReport(period, query)` aggregates revenue/orders/items per bucket; supports `day`, `week`, `month`, `year`, `range` periods
  - `getTodayStaffSummary` accepts optional `date` parameter
  - `listStaffOrders` filters by date when `query.date` is provided
- New backend API:
  - `GET /api/orders/sales?period=day|week|month|year|range&date=&year=&month=&startDate=&endDate=` (staff/admin)
  - `GET /api/orders/summary/today?date=` updated to accept optional date
- Frontend `order.api.ts`:
  - `getSalesReport(params)` API client
  - `SalesBucket` and `SalesReport` TypeScript interfaces
- Frontend `order.store.ts`:
  - `loadStaffOrders(date?)` passes date filter
  - `loadTodaySummary(date?)` passes date filter
- New view `frontend/src/views/staff/SalesReportView.vue`:
  - Period selector: 日報、週報、月報、年報、自訂區間
  - Date pickers adapt to selected period (date / week-anchor / year-month / year / range)
  - Custom range validates start ≤ end and max 366 days before querying
  - Summary cards: total revenue, orders, and items
  - Breakdown table shown when period produces multiple buckets
  - Sold items table always shown
- Route `/staff/sales` added with `roles: ['staff', 'admin']` guard
- Navigation: renamed "員工" to "員工訂單"; added "銷售報表" link for staff/admin

### UI Cursor Improvements

Status: Accepted

Implemented:

- Added `cursor-pointer` Tailwind class to all interactive buttons in:
  - `ProductListView.vue`: category filter buttons, 加入, 清空, +/-, 移除
  - `CheckoutView.vue`: 前往付款
  - `AdminProductsView.vue`: 新增/更新, 取消, 重新整理, 編輯, 刪除

## Verification Summary

Backend commands run from `backend`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Latest result:

- lint passed
- test passed: 11 suites, 84 tests
- build passed

Frontend commands run from `frontend`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run e2e
npm.cmd run build
```

Latest result:

- lint passed
- unit tests passed: 10 suites, 33 tests
- e2e passed: 94 tests (desktop Chromium + Pixel 5 mobile)
- build passed

RWD verification:

- Playwright runs both `chromium` desktop and `mobile-chrome` Pixel 5 projects.
- Latest frontend E2E result: 94 tests passed.
- Global navigation, shop, checkout, auth, order tracking, staff, and admin views have responsive layout baselines.

## Environment Notes

- `mongodb-memory-server` initially failed because the sandbox blocked downloading `https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.24.zip`.
- MongoDB 7.0.24 is now cached locally at `C:\Users\mseke\.cache\mongodb-binaries\mongod-x64-win32-7.0.24.exe`.
- Frontend `vitest` and `vite build` may need elevated execution in this environment because esbuild can attempt to read sandbox-blocked paths.
- Git currently warns that it cannot read `C:\Users\mseke\.config\git\ignore`; repo-level `.gitignore` still works.

## Containerization

Status: Accepted

Implemented:

- `backend/Dockerfile`: multi-stage build (builder → production). Runs `node dist/server.js`. Uses `npm ci --omit=dev` in production stage.
- `backend/.dockerignore`: excludes `node_modules/`, `dist/`, `.env`, logs, test artifacts, `.git/`.
- `docker-compose.yml` (root): starts `mongodb` (mongo:7), `backend`, and `frontend` services. All backend secrets are injected via environment variables; `JWT_SECRET`, `LINE_PAY_CHANNEL_ID`, `LINE_PAY_CHANNEL_SECRET` are required at runtime.
- `frontend/Dockerfile`: builds the Vite app with Node 20 and serves compiled `dist/` through Nginx.
- `frontend/nginx.conf`: serves static assets and uses `try_files $uri $uri/ /index.html` so Vue Router browser refreshes do not return 404.
- `frontend/.dockerignore`: excludes `node_modules/`, `dist/`, `.env`, test reports, cache files, and Git metadata.

## CI Pipeline

Status: Accepted

Implemented:

- `.github/workflows/ci.yml`: triggers on push/PR to `main`; also exposes `workflow_call` for reuse from CD jobs.
- Two parallel jobs:
  - **backend**: `npm ci` → lint → Jest test (MongoMemoryServer, no real DB) → TypeScript build. Injects `JWT_SECRET` and dummy Line Pay keys via `env:`.
  - **frontend**: `npm ci` → lint → Vitest unit tests → install Playwright Chromium → E2E tests → Vite build. E2E uses `page.route()` mock interceptors — no real backend required in CI.
- Both jobs must pass before a PR can be merged.

## E2E Tests (Playwright)

Status: Accepted

Implemented:

- Playwright 1.60 installed with Chromium browser.
- `playwright.config.ts` configured for `frontend/e2e/` with Chromium desktop and Pixel 5 mobile projects plus `webServer` auto-start.
- `npm run e2e` script added to `frontend/package.json`.
- `vitest.config.ts` scoped to `src/**/*.spec.ts` to exclude Playwright specs from Vitest.
- `e2e/helpers.ts` mock interceptors for products and auth APIs.
- Test files:
  - `e2e/product-shop.spec.ts`: product list, category filter, add to cart.
  - `e2e/auth.spec.ts`: login/register form, wrong password error, successful login redirect.
  - `e2e/checkout.spec.ts`: empty cart, guest form, order summary with cart items, guest lookup page.
  - `e2e/staff-admin.spec.ts`: unauthenticated route guards, session-loss redirect, normal user navigation.

Verified:

- 42 Playwright tests pass across desktop and mobile projects (all using mock API interceptors; no real backend required).
- `vitest run` still passes 9 suites, 19 tests after scope fix.

## CORS / FS-016

Status: Accepted

Implemented:

- `cors.spec.ts`: TC-027 (allowed origin), TC-028 (disallowed origin), TC-030 (preflight OPTIONS).
- `test/websocket.spec.ts`: TC-029 (Socket.io polling handshake does not echo CORS header for disallowed origin).

## Swagger API Documentation

Status: Accepted

Implemented:

- `swagger-jsdoc` + `swagger-ui-express` installed as production dependencies.
- `backend/src/config/swagger.ts`: OpenAPI 3.0 definition with shared schemas (User, Product, Order, Notification, ApiError, Pagination) and security schemes (bearerAuth, guestToken).
- JSDoc `@openapi` annotations added to all route files: auth, products, orders, payments, notifications, users.
- Mounted at `/api-docs` (Swagger UI) and `/api-docs.json` (raw JSON spec).
- Live: https://coffee-ordering-system-60aw.onrender.com/api-docs

## Cloud Deployment

Status: Accepted

Implemented:

- **MongoDB Atlas**: M0 Free cluster, Singapore region (`ap-southeast-1`). Network Access set to `0.0.0.0/0` for Render dynamic IPs.
- **Render (Backend)**: Docker container deployment from `backend/Dockerfile`. Environment variables injected via Render dashboard. URL: `https://coffee-ordering-system-60aw.onrender.com`.
- **Vercel (Frontend)**: Connects to GitHub `main` branch, root directory `frontend/`. `VITE_API_BASE_URL` and `VITE_SOCKET_URL` set as environment variables. URL: `https://coffee-ordering-system-delta.vercel.app`.
- **Vercel SPA routing**: `frontend/vercel.json` added with `rewrites` rule (`/(.*) → /index.html`) to prevent 404 on direct Vue route access.

## Product imageUrl

Status: Accepted

Implemented:

- `ProductModel`: added `imageUrl: { type: String, default: '' }`.
- `product.validators.ts`: added `imageUrl: z.string().url().optional().or(z.literal(''))`.
- `frontend/src/api/product.api.ts`: added `imageUrl?: string` to `Product` interface.
- `ProductListView.vue`: shows 96×96 rounded image when `imageUrl` is present.
- `AdminProductsView.vue`: added Image URL input field with live preview below input.

## Demo Seed Script

Status: Accepted

Implemented:

- `backend/src/scripts/seed.ts`: clears all users, products, and orders, then creates 3 demo accounts, 10 products with Unsplash image URLs, and **60 days of historical orders** with realistic daily volume variation.
  - Day-of-week multipliers: higher volume on weekends, lower mid-week.
  - 35% guest orders, 65% member orders.
  - 1–3 items per order, 1–2 qty each.
  - Today's orders include pending/preparing/completed statuses; historical orders are mostly completed.
  - Uses `OrderModel.collection.insertMany()` with custom `createdAt` timestamps to populate historical data.
- `npm run seed` script in `backend/package.json`.
- Supports both local MongoDB and Atlas: set `MONGODB_URI` in `backend/.env` or pass inline.
- `backend/.env.example` documents both local and Atlas URI options.

Demo accounts (after seed):

| Role  | Email           | Password |
|-------|-----------------|----------|
| Admin | admin@demo.com  | demo1234 |
| Staff | staff@demo.com  | demo1234 |
| User  | user@demo.com   | demo1234 |

## Local Development Setup

To run the full stack locally with Docker:

```powershell
# Create a .env file or export variables
$env:JWT_SECRET="dev-secret"
$env:LINE_PAY_CHANNEL_ID="dev-channel"
$env:LINE_PAY_CHANNEL_SECRET="dev-secret"

# Start all services
docker compose up --build

# Seed demo data (in a separate terminal)
cd backend
$env:MONGODB_URI="mongodb://localhost:27017/coffee_ordering"
npm run seed
```

Services:
- Frontend: http://localhost:5173 (Nginx serving Vite build)
- Backend: http://localhost:3000
- MongoDB: localhost:27017

---

## Post-Ship Enhancements (2026-05-18 rev 2)

### UI/UX Improvements

- **Skeleton loading**: ProductListView, StaffOrdersView, AdminProductsView, SalesReportView now show animated skeleton cards during load.
- **Toast notifications**: `useToastStore` + `ToastContainer` component for success/error feedback on all mutating actions.
- **Confirm dialog**: Promise-based `useConfirmStore` + `ConfirmDialog` component; wired to AdminProductsView delete action.
- **Status stepper**: GuestOrderTrackingView and MyOrdersView now show a 5-step progress stepper (待處理→已接單→製作中→可取餐→已完成) with emerald highlight and pulse animation on `ready` state.
- **GuestOrderTrackingView redesign**: Two-column layout (lg:grid-cols-2) — query form left, order status right. Notification history shows count badge.
- **MyOrdersView redesign**: Collapsible order cards with summary row when collapsed, stepper + item detail when expanded. Socket.io joinOrderRoom on expand. Points earned badge and order type label.

### Web Push Notifications

- VAPID-based Web Push integrated (backend: `web-push` library; frontend: Service Worker at `/sw.js`).
- `PushSubscriptionModel` stores per-user subscriptions; auto-cleans expired endpoints (410/404).
- Push triggered when order status transitions to `ready` via `notifyStatusUpdate`.
- `PushNotificationToggle` component in MyOrdersView header; requests permission and subscribes/unsubscribes.
- Gracefully no-ops if `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` not set.

New env vars (backend): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`  
New env vars (frontend): `VITE_VAPID_PUBLIC_KEY`

Generate keys: `cd backend && npx web-push generate-vapid-keys`

### Points System UI (`/points`)

- `GET /api/auth/me` now queries DB and returns live `points` field (was returning JWT payload only).
- `authStore.refreshUser()` action refreshes user.points from `/me`; called after payment confirm and after redeem.
- `PointsView` at `/points` (role: user only):
  - Balance card with progress bar toward next redeem threshold.
  - Redeemable product list loaded from `/api/products?available=true` filtered by `isRedeemable`.
  - Confirm-dialog-gated redeem flow; calls `POST /api/orders/redeem`, then `refreshUser()` + `loadMyOrders()`.
  - Points history derived from `myOrders` (earned/redeemed).
- Nav link "我的點數" with live badge showing current points (visible to `role: user` only).
- `createRedeemOrder(productId)` added to `order.api.ts`.
- `LinePayConfirmView` calls `authStore.refreshUser()` after successful payment.

### AWS Deployment Infrastructure

- `deploy/ec2-userdata.sh`: EC2 bootstrap script (Docker install + ECR pull + container run).
- `.github/workflows/deploy.yml`: CD pipeline — CI check → ECR image push → EC2 SSH deploy → S3 sync → CloudFront invalidation.
- `deploy/SETUP.md`: Step-by-step AWS resource setup guide (EC2 t2.micro + S3 + CloudFront + ECR + Atlas M0).
- `backend/src/config/env.ts`: Removed hardcoded Vercel URL; use `FRONTEND_URL` env var.
- `ci.yml`: Added `workflow_call` trigger so deploy.yml can reuse CI jobs.

### Security & Code Quality Fixes (2026-05-18 rev 3)

Ten code-review findings resolved (Critical → Medium → Minor):

**Critical**

- **Fix 1** (`order.service.ts` `getGuestOrder`): Added `tokenNotExpired` check — guest token validated against `guestTokenExpiresAt`; expired tokens are now rejected.
- **Fix 2** (`payment.service.ts` `createMockPaymentUrl`): Removed raw `guestToken` from mock redirect URL query params; frontend reads it from `orderStore.guestToken`.
- **Fix 3** (`env.ts`): Added production guard — server throws at startup if `JWT_SECRET` is still `change-me` when `NODE_ENV === 'production'`.
- **Fix 4** (`payment.service.ts`): Removed duplicate `hashGuestToken` local function; now imported from `utils/crypto` (single canonical implementation).

**Medium**

- **Fix 5** (`order.service.ts` `createRedeemOrder`): Added try/catch around `OrderModel.create`; on failure, atomically refunds the deducted points via `pointService.returnPoints` before re-throwing.
- **Fix 6** (`order.service.ts` `returnRedeemedPointsIfCancelled`): Removed in-memory `order.pointsRedeemed = 0` mutation; DB is the single source of truth via `OrderModel.updateOne`.
- **Fix 7** (`LinePayConfirmView.vue`): Error handling replaced with structured code lookup (`PAYMENT_AMOUNT_MISMATCH`, `ORDER_ACCESS_DENIED`, etc.), localized messages, and a "查看我的訂單" fallback link.
- **Fix 8** (`http.ts`): Added Axios response interceptor — auto-calls `authStore.logout()` on any 401 response so stale/expired tokens clear automatically.

**Minor**

- **Fix 9** (`PointsView.vue` `onMounted`): Always calls `orderStore.loadMyOrders()` on mount regardless of cached data.
- **Fix 10** (`order.store.ts` `loadTodaySummary`): Removed dead fallback that re-fetched 200 paid orders when `soldItems` was empty; backend always returns `soldItems`.

Verified: backend 11 suites / 70 tests passed; frontend 9 suites / 21 tests passed; both `npm run build` clean.

---

## Post-Ship Enhancements (2026-05-18 rev 5)

### Bug Fixes

- **AUTH_FORBIDDEN on 點餐紀錄 for staff** (`order.routes.ts` line 209): `authorize(['user', 'admin'])` excluded `staff` role. Fixed to `authorize(['user', 'staff', 'admin'])`.
- **Staff 點餐紀錄 empty after seed** (`seed.ts`): Historical and today's orders were only assigned to `user@demo.com`. Fixed by passing both `memberUser._id` and `staffUser._id` to `buildHistoricalOrders`, and adding `DEMO0005` (today, completed) assigned to `staffUser`.

### UI/UX — MyOrdersView date grouping

- **Date dividers**: Replaced flat order list with date-grouped sections. Each section shows a centered divider with label (`今天` / `昨天` / `M/D（週X）`) and a pill showing order count for that day.
- Grouping uses `Intl.DateTimeFormat` with `Asia/Taipei` timezone so midnight boundaries are correct regardless of client locale.
- No filter buttons needed — all orders remain visible, grouped by day for easy scanning.

---

## Post-Ship Enhancements (2026-05-18 rev 6)

### Order History Permissions

- `User` 點餐紀錄只載入自己的會員訂單。
- `Staff` / `Admin` 點餐紀錄透過 `GET /api/orders?all=true` 載入完整訂單記錄。
- 登入、登出與進入點餐紀錄前會清空前一個帳號殘留的訂單列表，避免 staff/admin 完整清單被一般 user 沿用。
- `Guest` 不提供「點餐紀錄」頁面；訪客只能透過「訂單追蹤」用查詢碼與手機/token 查詢自己的訂單。

### Guest Tracking

- `GuestOrderTrackingView` 保留查詢表單、訂單狀態、點餐明細與通知紀錄。
- 已移除訪客模式的「點餐紀錄」區塊，避免讓訪客誤以為可查看完整歷史訂單。
- README、部署指南與規格書已同步說明：加入會員後建立的新訂單才會出現在會員點餐紀錄，訪客既有訂單仍以訂單追蹤查詢。

### Payment Redirect Hardening

- Production backend now avoids generating Line Pay confirm/cancel redirect URLs pointing to `localhost`.
- Render deployment docs now require `FRONTEND_URL` in addition to `CLIENT_ORIGIN`, and document the `localhost:5173` refusal troubleshooting path.

Verified:

- `frontend`: `npm.cmd run build`
- `frontend`: `npm.cmd run e2e -- guest-order-tracking.spec.ts`
- `backend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- env.spec.ts payment.spec.ts`

---

## Post-Ship Enhancements (2026-05-19 rev 7)

### Mobile Navigation RWD

- `App.vue` desktop keeps the horizontal top navigation.
- Mobile header now shows brand + menu button, and navigation items are shown in a right-side drawer.
- Drawer uses the same role-based navigation rules as desktop:
  - Guest does not see 「點餐紀錄」.
  - User sees member features only.
  - Staff/Admin see staff/admin links.
- Drawer closes after link click, logout, or route change.

### Stable Checkout CTAs

- Product page 「前往結帳」 keeps stable sizing: fixed width on wider screens and full-width on narrow screens.
- Checkout page 「前往付款」 now uses one shared responsive style for both member and guest checkout:
  - mobile: full-width, fixed height
  - `sm` and above: fixed width and fixed height
- This prevents CTA width changes when switching between 會員點餐 and 訪客點餐.

### Documentation

- README documents mobile drawer navigation and responsive checkout CTA behavior.
- Render/Vercel deployment guide includes post-deploy UI validation items.
- Specification now includes global navigation RWD rules and checkout CTA sizing requirements.

Verified:

- `frontend`: `npm.cmd run build`
- `frontend`: `npm.cmd run e2e -- product-shop.spec.ts checkout.spec.ts auth.spec.ts --project=mobile-chrome`
- `frontend`: `npm.cmd run e2e -- staff-admin.spec.ts sales-report.spec.ts --project=mobile-chrome`

---

## Post-Ship Enhancements (2026-05-19 rev 8)

### Member Tracking And Order Codes

- Member checkout now collects a pickup phone so member orders can show phone information in tracking and order history.
- Member purchase orders and redeem orders generate customer-facing `orderLookupCode`.
- `/orders/guest` now also serves logged-in `user` customers by listing their recent member order lookup code, pickup phone, and current status, with a "帶入查詢" action.
- `/orders/guest` was redesigned into a tracking workspace: quick lookup on the left, member recent orders below it, and a persistent current-order status panel with lookup code, phone, payment state, stepper, items, and notifications.
- The UI no longer falls back to displaying internal Mongo order IDs as customer-facing order numbers. Orders without lookup codes show neutral labels such as `未產生查詢碼` or `兌換訂單`.
- Guest tracking clears stale guest tracking state after lookup failure so old seeded lookup codes do not reappear after refresh.

### Points Redemption UX

- After point redemption, the points page shows where points went, remaining points, the created redeem order, and a direct link to order history for tracking.
- Redeem orders in order history show `點數兌換` and consumed points.

### Seed Refresh

- Production Atlas `coffee_ordering` seed was refreshed.
- Demo guest lookup examples:
  - `DEMO0001` / `0912345678`
  - `DEMO0003` / `0934567890`

Verified:

- `frontend`: `npm.cmd run build`
- `frontend`: `npm.cmd run e2e -- guest-order-tracking.spec.ts my-orders.spec.ts points.spec.ts`
- `frontend`: `npm.cmd run e2e -- auth.spec.ts`
- `backend`: `npm.cmd run seed` against Atlas `coffee_ordering`

---

## Post-Ship Enhancements (2026-05-18 rev 4)

### CI/CD Gate + README Security Hardening

- **CI E2E gate**: Updated `.github/workflows/ci.yml` frontend job to include Playwright E2E step (`npx playwright install --with-deps chromium` → `npm run e2e`). All PRs now must pass lint + unit + E2E + build before merge.
- **README demo credential warning**: Added "Do not reuse these credentials in any production environment." note above the demo accounts table so public repo visitors understand they are seed-script defaults.
- **README CI badge**: Added `![CI](…/ci.yml/badge.svg)` to the README header for immediate build status visibility.
