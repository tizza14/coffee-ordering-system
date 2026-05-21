# Coffee Ordering System

![CI](https://github.com/tizza14/coffee-ordering-system/actions/workflows/ci.yml/badge.svg)

Real-time coffee ordering demo with a Vue 3 frontend, Express/TypeScript backend, MongoDB Atlas, JWT role-based access, guest checkout, staff order handling, admin management, Socket.io notifications, points redemption, Line Pay-compatible payment flow, Cloudinary product image upload/removal, and a sales report dashboard for staff and admin.

## Live Demo

- Frontend: https://coffee-ordering-system-delta.vercel.app
- Backend: https://coffee-ordering-system-60aw.onrender.com
- Swagger: https://coffee-ordering-system-60aw.onrender.com/api-docs

## Demo Accounts

These are seed-script defaults for the live demo. **Do not reuse these credentials in any production environment.**

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@demo.com | demo1234 |
| Staff | staff@demo.com | demo1234 |
| Member | user@demo.com | demo1234 |

Guest checkout does not require login. Add products to the cart, open Checkout, keep Guest order selected, enter guest info, and submit. Guests use **訂單追蹤** with lookup code and phone/token to check an order. Members enter a pickup phone during checkout; member orders also receive a lookup code and appear in **訂單追蹤** after login with lookup code, phone, and current status. Creating a member account is required for **點餐紀錄**, full historical records, and points.

## UI Notes

- Desktop uses the top navigation bar; mobile uses a right-side drawer menu opened from the header menu button.
- The Checkout **前往付款** button is responsive: full-width on mobile for touch comfort, fixed width from `sm` screens upward. Member checkout and guest checkout share the same button sizing.
- The Products **前往結帳** button also keeps a stable fixed size on wider screens and becomes full-width on narrow screens.
- Internal Mongo order IDs are not shown as customer-facing order numbers. UI displays `orderLookupCode`; orders without one show a neutral label such as `未產生查詢碼` or `兌換訂單`.

## Demo Flow

1. Open the frontend and browse Products.
2. Add one or more items to the cart.
3. Go to Checkout.
4. For guest checkout, fill name, phone, and optional email. For member checkout, fill the pickup phone.
5. Submit the order and continue through the payment confirmation flow.
6. For guest orders, open **訂單追蹤** and enter the lookup code and phone manually.
7. Use Member login to open **訂單追蹤** or **點餐紀錄** for that member's own orders. The tracking page shows the member order lookup code, pickup phone, and current status.
8. Use Staff/Admin login to open **點餐紀錄** for all orders, or **員工訂單** to process paid pending orders in order: `pending → accepted → preparing → ready → completed`.
9. Use Staff or Admin login to open **銷售報表** and query daily / weekly / monthly / yearly sales, or use the custom date-range picker.
10. Use Admin login to manage products and user roles.

## API Notes

- `GET /api/products` returns available products by default. Use `available=false` to list hidden products and `available=all` for admin product management lists that include both available and unavailable products.
- Admins can upload product images with `POST /api/products/:id/image` and remove them with `DELETE /api/products/:id/image`.

## Documentation Maintenance

Every code change must include matching documentation updates before handoff. Check `README.md`, `DEVELOPMENT_PROGRESS.md`, `Coffee Real-time Ordering System 規格書.md`, route Swagger/JSDoc comments, and the AI agent reference when behavior, APIs, UI flows, environment variables, deployment steps, tests, or operational assumptions change.

Markdown files are encoded as UTF-8 with BOM in `.editorconfig` so Windows tools do not misread Traditional Chinese as ANSI/Big5. Agent-facing rules are tracked in `AGENTS.md`; local-only guidance may also exist in `CLAUDE.md`.

Active project docs stay in the repository root. Historical or long-form references live in `docs/archive/`, including `docs/archive/Coffee Ordering AI Agents 開發參考.md` and `docs/archive/implementation-notes.html`.

## Local Development

### Prerequisites

Both services need a `.env` file. Copy the examples first:

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

### Start Backend (terminal 1)

```powershell
cd backend
npm install
npm run dev
```

Starts on http://localhost:3000. Look for `Backend listening on 3000`.

### Start Frontend (terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Starts on http://localhost:5173.

### Default local URLs

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:3000        |
| Swagger  | http://localhost:3000/api-docs |

## Environment Variables

### Backend (`backend/.env`)

```text
NODE_ENV=development
PORT=3000

# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/coffee_ordering

# Cloud MongoDB Atlas (uncomment and fill in to use Atlas)
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/coffee_ordering?retryWrites=true&w=majority

JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173,https://coffee-ordering-system-delta.vercel.app
FRONTEND_URL=http://localhost:5173
LINE_PAY_CHANNEL_ID=your-channel-id
LINE_PAY_CHANNEL_SECRET=your-channel-secret
LINE_PAY_API_BASE_URL=https://sandbox-api-pay.line.me
LINE_PAY_MOCK=true
LINE_PAY_CONFIRM_URL=http://localhost:5173/payments/line-pay/confirm
LINE_PAY_CANCEL_URL=http://localhost:5173/payments/line-pay/cancel

# Cloudinary (product image upload)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend (`frontend/.env`)

```text
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Seed Demo Data

The seed script creates 3 demo accounts, 10 products, and **60 days of historical orders** (varying daily volume by day of week, mixed member/guest, paid/completed/cancelled statuses). This gives the sales report meaningful data to display immediately after seeding.

Seed clears all existing users, products, and orders before inserting.

Current seeded guest lookup examples:

| Lookup Code | Phone | Status |
| --- | --- | --- |
| `DEMO0001` | `0912345678` | 待處理 |
| `DEMO0003` | `0934567890` | 可取餐 |

### Seed against local MongoDB

Make sure local MongoDB is running, then:

```powershell
cd backend
npm run seed
```

### Seed against MongoDB Atlas

Edit `backend/.env` to set `MONGODB_URI` to your Atlas connection string, then:

```powershell
cd backend
npm run seed
```

Or pass the URI inline without editing the file:

```powershell
cd backend
$env:MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/coffee_ordering?retryWrites=true&w=majority"
npm run seed
```

**Switching between local and Atlas only requires changing `MONGODB_URI`.** Seed both environments independently to have test data in each.

## Verification

Backend:

```powershell
cd backend
npm run lint
npm test
npm run build
```

Frontend:

```powershell
cd frontend
npm run lint
npm test
npm run e2e
npm run build
```

## Deployment Notes

- Render backend must allow the Vercel frontend origin through `CLIENT_ORIGIN`.
- Render backend should set `FRONTEND_URL` to the deployed frontend URL. In production, the backend refuses to generate localhost Line Pay redirect URLs and falls back to the first non-local frontend origin.
- Render backend `MONGODB_URI` must include the database name, e.g. `mongodb+srv://<user>:<password>@<cluster-host>/coffee_ordering?retryWrites=true&w=majority`. If the URI ends at `.mongodb.net/?...`, MongoDB writes to the default `test` database.
- Demo payment uses `LINE_PAY_MOCK=true`. If real or sandbox Line Pay returns an unusable response, the backend falls back to a demo confirmation URL outside test mode.
- All customer-facing notification messages (e.g. payment confirmations and status updates) are localized to Traditional Chinese. Order status transitions (pending, accepted, preparing, ready, completed, cancelled) are displayed in Traditional Chinese.
- Access rules: guests do not have a **點餐紀錄** page and can only track their own order through **訂單追蹤**; members see their own lookup code, pickup phone, status, and **點餐紀錄**; staff/admin can see complete order history.
