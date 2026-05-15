# Coffee Ordering System

Real-time coffee ordering demo with a Vue 3 frontend, Express/TypeScript backend, MongoDB Atlas, JWT role-based access, guest checkout, staff order handling, admin management, Socket.io notifications, points redemption, and Line Pay-compatible payment flow.

## Live Demo

- Frontend: https://coffee-ordering-system-delta.vercel.app
- Backend: https://coffee-ordering-system-60aw.onrender.com
- Swagger: https://coffee-ordering-system-60aw.onrender.com/api-docs

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@demo.com | demo1234 |
| Staff | staff@demo.com | demo1234 |
| Member | user@demo.com | demo1234 |

Guest checkout does not require login. Add products to the cart, open Checkout, keep Guest order selected, enter guest info, and submit.

## Demo Flow

1. Open the frontend and browse Products.
2. Add one or more items to the cart.
3. Go to Checkout.
4. For guest checkout, fill name, phone, and optional email. No account is required.
5. Submit the order and continue through the payment confirmation flow.
6. Use Staff login to process paid pending orders in order: `pending -> accepted -> preparing -> ready -> completed`.
7. Use Admin login to manage products and user roles.

## Local Development

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Default local URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api-docs

## Environment Variables

Backend:

```text
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/coffee_ordering
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173,https://coffee-ordering-system-delta.vercel.app
LINE_PAY_CHANNEL_ID=your-channel-id
LINE_PAY_CHANNEL_SECRET=your-channel-secret
LINE_PAY_API_BASE_URL=https://sandbox-api-pay.line.me
LINE_PAY_MOCK=true
LINE_PAY_CONFIRM_URL=http://localhost:5173/payments/line-pay/confirm
LINE_PAY_CANCEL_URL=http://localhost:5173/payments/line-pay/cancel
```

Frontend:

```text
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Production frontend falls back to the Render backend URL if Vite environment variables are missing.

## Seed Demo Data

Seed creates 3 demo accounts and 10 products. It clears existing users and products first.

```powershell
cd backend
$env:MONGODB_URI="mongodb+srv://<user>:<password>@<cluster-host>/?retryWrites=true&w=majority"
npm run seed
```

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
- Demo payment can use `LINE_PAY_MOCK=true`. If real or sandbox Line Pay returns an unusable response, the backend falls back to a demo confirmation URL outside test mode.
- Staff order status transitions are strict. The UI only shows valid next actions, and the backend rejects invalid transitions with `INVALID_STATUS_TRANSITION`.
