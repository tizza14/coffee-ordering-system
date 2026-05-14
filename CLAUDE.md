# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Coffee Real-time Ordering System — a full-stack TypeScript monorepo with a Node.js/Express backend and a Vue 3 frontend. Key features: JWT auth with RBAC, Line Pay integration, Socket.io real-time updates, a points/redemption system, and guest order tracking.

## Commands

### Backend (`cd backend`)
```bash
npm run dev        # ts-node-dev hot-reload server
npm run build      # tsc compile → dist/
npm run lint       # ESLint
npm test           # Jest --runInBand (must run in band — tests share MongoMemoryServer)
npx jest src/modules/auth/auth.spec.ts --runInBand   # single spec file
```

### Frontend (`cd frontend`)
```bash
npm run dev        # Vite dev server
npm run build      # vue-tsc type check + Vite build
npm run lint       # ESLint
npm test           # Vitest run
npx vitest run src/stores/auth.store.spec.ts          # single spec file
```

## Environment Variables

**Backend** (`.env` in `backend/`):
| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `MONGODB_URI` | `mongodb://localhost:27017/coffee_ordering` | |
| `JWT_SECRET` | `change-me` | Must override in prod |
| `JWT_EXPIRES_IN` | `1d` | |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Never use `*` |
| `LINE_PAY_CHANNEL_ID` | `test-channel-id` | |
| `LINE_PAY_CHANNEL_SECRET` | `test-channel-secret` | |
| `LINE_PAY_API_BASE_URL` | `https://sandbox-api-pay.line.me` | Sandbox by default |
| `LINE_PAY_CONFIRM_URL` | `http://localhost:5173/payments/line-pay/confirm` | Frontend redirect URL |
| `LINE_PAY_CANCEL_URL` | `http://localhost:5173/payments/line-pay/cancel` | Frontend cancel redirect URL |

**Frontend** (`.env` copied from `frontend/.env.example`):
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Architecture

### Backend (`backend/src/`)

**Entry flow**: `server.ts` → connects MongoDB → creates Express app (`app.ts`) → attaches Socket.io (`sockets/socket.server.ts`) → listens.

**Module structure** — each feature under `modules/<name>/` contains: `*.model.ts`, `*.service.ts`, `*.controller.ts`, `*.routes.ts`, `*.validators.ts`, `*.spec.ts`. Modules: `auth`, `products`, `orders`, `payments`, `notifications`, `points`, `users`.

**Middleware chain** (in order):
1. `cors` — origin from `env.clientOrigin`
2. `express.json()`
3. Routes mount at `/api/<name>`
4. `authenticate` — verifies JWT, attaches `req.user = { id, role }`
5. `authorize(roles)` — RBAC check for `['user', 'staff', 'admin']`
6. `validateBody(schema)` — Zod schema validation
7. `errorMiddleware` — converts `ApiError` to JSON responses

**Error handling**: throw `new ApiError(status, code, message)` anywhere; `asyncHandler` wraps async route handlers; `errorMiddleware` catches everything at the end.

**Testing**: `src/test/testDb.ts` exports `connectTestDb / clearTestDb / disconnectTestDb` using `mongodb-memory-server`. All specs use this — never mock the database. Tests must run with `--runInBand`.

**Points system**: 1 point per $100 paid (`calculateEarnedPoints` in `point.service.ts`). Redemption costs 3 points (`REDEEM_POINTS_COST`). Guest orders never earn points. Point deduction uses atomic MongoDB update to prevent race conditions.

**Guest orders**: identified by `orderLookupCode` (human-readable) + `guestTokenHash` (hashed token stored server-side) with `guestTokenExpiresAt`. Guest lookup requires `phone` or `X-Guest-Token` header.

**Line Pay**: `linePay.client.ts` signs requests with HMAC-SHA256. In tests/CI, never call the real API — mock the client or use sandbox. Confirm is idempotent (already `paid` → return early, no duplicate points). Amount mismatch throws 409. Redirect URLs come from env (`LINE_PAY_CONFIRM_URL`, `LINE_PAY_CANCEL_URL`).

**Socket.io rooms**:
- `room:staff` — staff and admin only
- `room:user:<userId>` — owner or admin
- `room:order:<orderId>` — staff/admin, or the order's owner (user or guest with matching token)

Events emitted: `order_updated` (order status changes), `notification` (new notification objects).

### Frontend (`frontend/src/`)

**HTTP client**: `api/http.ts` — axios instance with `VITE_API_BASE_URL` base URL. Request interceptor injects `Authorization: Bearer <token>` from `authStore`. Guest token sent as `X-Guest-Token` header where needed.

**State management** (Pinia stores): `auth`, `cart`, `order`, `payment`, `notification`, `socket`. The `socket` store manages the Socket.io client connection and listens for `order_updated` and `notification` events.

**Routing**: Vue Router with history mode. Route guards in `router/guards.ts` (`canAccessRoute`, `getCurrentRouteRole`) are applied via `router.beforeEach` in `router/index.ts`. Roles: `guest` (unauthenticated), `user`, `staff`, `admin`.

**Views** organized under `views/`: `auth/`, `shop/`, `orders/`, `payments/`, `staff/`, `admin/`.

### Frontend RWD Standards

- Every new or changed view must work at mobile, tablet, and desktop widths. Treat mobile as a first-class layout, not an afterthought.
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`, `max-[...]`) to control layout changes. Prefer single-column mobile layouts and switch to multi-column layouts only when there is enough width.
- Global navigation must remain usable on narrow screens. If links cannot fit, allow wrapping or horizontal overflow inside the nav instead of letting text overlap or leave the viewport.
- Page-level spacing should be responsive: use smaller padding on mobile (`p-4`) and larger padding from `sm:` or `lg:` upward.
- Cards, forms, order rows, product rows, and admin controls must wrap or stack on small screens. Do not rely on fixed desktop widths unless paired with a mobile fallback.
- Avoid text overflow in buttons, badges, table-like rows, and cards. Use wrapping, `min-w-0`, responsive grids, or flex wrapping where content can grow.
- Playwright E2E must include both desktop Chromium and mobile Chromium projects for frontend smoke flows. RWD-related changes are not accepted until `npm run e2e` passes.
- Before marking frontend work done, run `npm run lint`, `npm test`, `npm run e2e`, and `npm run build` from `frontend/`.

## Key Business Rules

- `totalAmount` is always computed backend-side from product prices; never trust the frontend amount.
- Staff can only accept orders with `paymentStatus = paid` (BR-003).
- Order status transitions follow `allowedTransitions` strictly; invalid transitions return 400.
- `completed` and `cancelled` are terminal states.
- Points accrue only once: when `paymentStatus` first becomes `paid` for a `purchase` order.
- Redeem orders skip Line Pay; `paymentStatus` is set directly to `paid` on creation.
- Cancelling a `redeem` order returns the 3 deducted points atomically.
- Guest users never accumulate points.

## API Summary

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/products                      public
POST   /api/products                      admin
PUT    /api/products/:id                  admin
DELETE /api/products/:id                  admin

POST   /api/orders                        user/admin
POST   /api/orders/guest                  public
POST   /api/orders/redeem                 user
GET    /api/orders/my                     user/admin
GET    /api/orders                        staff/admin (query: status, paymentStatus, page, limit)
GET    /api/orders/:id                    staff/admin or order owner
GET    /api/orders/guest/:lookupCode      public (requires phone or X-Guest-Token)
PATCH  /api/orders/:id/status             user/staff/admin

POST   /api/payments/line-pay/request     user or guest (X-Guest-Token)
POST   /api/payments/line-pay/confirm     user or guest (X-Guest-Token)
GET    /api/payments/line-pay/cancel      public (query: orderId)

GET    /api/notifications                 user (authenticated)
GET    /api/notifications/guest/:code     public (requires phone or X-Guest-Token)
PATCH  /api/notifications/:id/read        user or guest

GET    /api/users                         admin
PATCH  /api/users/:id/role                admin
```

## Route Permission Table (Frontend)

| Route | Allowed | Guard |
|-------|---------|-------|
| `/products` | all | public |
| `/checkout` | all | public |
| `/login`, `/register` | guest only | redirect to `/products` if authenticated |
| `/orders/my` | user+ | redirect to `/login` if not authenticated |
| `/orders/guest` | all | public |
| `/payments/line-pay/confirm` | all | public |
| `/staff/orders` | staff/admin | redirect to `/products` if insufficient role |
| `/admin/products` | admin | redirect to `/products` if insufficient role |
| `/admin/users` | admin | redirect to `/products` if insufficient role |

## Hard Rules (from spec)

- Never set `CORS origin: *`
- Never call the real Line Pay API in tests or CI
- Don't switch package managers (use `npm`)
- Don't change the test framework (backend: Jest, frontend: Vitest)
- Each `npm test` must pass before a feature is considered done, along with `npm run lint` and `npm run build`
- Frontend UI changes must satisfy the RWD standards above and pass Playwright desktop/mobile smoke tests
