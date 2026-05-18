# Coffee Ordering System

![CI](https://github.com/binghan60/coffee-ordering-system/actions/workflows/ci.yml/badge.svg)

Real-time coffee ordering demo with a Vue 3 frontend, Express/TypeScript backend, MongoDB Atlas, JWT role-based access, guest checkout, staff order handling, admin management, Socket.io notifications, points redemption, Line Pay-compatible payment flow, and a sales report dashboard for staff and admin.

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

Guest checkout does not require login. Add products to the cart, open Checkout, keep Guest order selected, enter guest info, and submit. Guests use **訂單追蹤** with lookup code and phone/token to check an order. Creating a member account is required for **點餐紀錄**, full historical records, and points.

## Demo Flow

1. Open the frontend and browse Products.
2. Add one or more items to the cart.
3. Go to Checkout.
4. For guest checkout, fill name, phone, and optional email. No account is required.
5. Submit the order and continue through the payment confirmation flow.
6. For guest orders, open **訂單追蹤** and enter the lookup code and phone manually.
7. Use Member login to open **點餐紀錄** for that member's own orders.
8. Use Staff/Admin login to open **點餐紀錄** for all orders, or **員工訂單** to process paid pending orders in order: `pending → accepted → preparing → ready → completed`.
9. Use Staff or Admin login to open **銷售報表** and query daily / weekly / monthly / yearly sales, or use the custom date-range picker.
10. Use Admin login to manage products and user roles.

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
```

### Frontend (`frontend/.env`)

```text
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Seed Demo Data

The seed script creates 3 demo accounts, 10 products, and **60 days of historical orders** (varying daily volume by day of week, mixed member/guest, paid/completed/cancelled statuses). This gives the sales report meaningful data to display immediately after seeding.

Seed clears all existing users, products, and orders before inserting.

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
- Staff order status transitions are strict. The UI only shows valid next actions, and the backend rejects invalid transitions with `INVALID_STATUS_TRANSITION`.
- Access rules: guests do not have a **點餐紀錄** page and can only track their own order through **訂單追蹤**; members see only their own **點餐紀錄**; staff/admin can see complete order history.
