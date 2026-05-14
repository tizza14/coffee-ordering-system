# Development Progress

Last updated: 2026-05-14 15:42 +08:00

This is the single source of truth for project progress. Keep future updates in this file instead of creating separate `PROGRESS_*.md` files.

## Overall Status

Backend core features are implemented through product listing/admin CRUD, authentication/RBAC, order creation/tracking, Line Pay flow, WebSocket notifications, member points, and redemption orders.

Frontend features are implemented through shop/auth/cart, checkout, payment confirmation, member order history, guest tracking, staff order handling, and admin product management.

All planned feature specs through `FS-016` now have an implemented and verified path. Backend API E2E and frontend browser smoke E2E are accepted. Frontend RWD baseline has been added and verified on desktop and mobile Playwright projects.

Containerization has been added to the specification for later implementation. Dockerfiles and Docker Compose are not implemented yet.

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

Status: Partially Accepted

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

## Verification Summary

Backend commands run from `backend`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run e2e
npm.cmd run build
```

Latest result:

- lint passed
- test passed: 11 suites, 58 tests
- build passed

Frontend commands run from `frontend`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Latest result:

- lint passed
- test passed: 9 suites, 19 tests
- e2e passed: 36 tests
- build passed

RWD verification:

- Playwright now runs both `chromium` desktop and `mobile-chrome` Pixel 5 projects.
- Latest frontend E2E result: 36 tests passed.
- Global navigation, shop, checkout, auth, order tracking, staff, and admin views have responsive layout baselines.

## Environment Notes

- `mongodb-memory-server` initially failed because the sandbox blocked downloading `https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.24.zip`.
- MongoDB 7.0.24 is now cached locally at `C:\Users\mseke\.cache\mongodb-binaries\mongod-x64-win32-7.0.24.exe`.
- Frontend `vitest` and `vite build` may need elevated execution in this environment because esbuild can attempt to read sandbox-blocked paths.
- Git currently warns that it cannot read `C:\Users\mseke\.config\git\ignore`; repo-level `.gitignore` still works.

## Containerization Spec

Status: Specified, not implemented

Added to the spec and development guidance:

- Backend production deployment must support Docker image builds.
- Backend container must run compiled `dist/server.js`.
- Runtime secrets must be injected via environment variables, never baked into images.
- Local integration environment should use Docker Compose for Backend + MongoDB.
- Frontend container is optional when deploying through Vercel, but required for container-platform deployment.
- Docker build contexts must exclude dependency folders, build outputs, `.env`, reports, Playwright artifacts, and Git metadata.
- CI/CD should add Docker image build after containerization is implemented.

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

- 36 Playwright tests pass across desktop and mobile projects (all using mock API interceptors; no real backend required).
- `vitest run` still passes 9 suites, 19 tests after scope fix.

## CORS / FS-016

Status: Accepted

Implemented:

- `cors.spec.ts`: TC-027 (allowed origin), TC-028 (disallowed origin), TC-030 (preflight OPTIONS).
- `test/websocket.spec.ts`: TC-029 (Socket.io polling handshake does not echo CORS header for disallowed origin).

## Next Recommended Work

1. Implement containerization:
   - backend Dockerfile
   - frontend Dockerfile if needed for target platform
   - root docker-compose.yml for local Backend + MongoDB
   - .dockerignore files
2. Add deployment/runtime documentation for production environment variables and service startup order.
3. Push commits to `origin/main` when ready.
