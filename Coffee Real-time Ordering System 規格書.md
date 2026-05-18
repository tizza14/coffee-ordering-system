# ☕ Coffee Real-time Ordering System 規格書

---

# 1. 專案概述

## 1.1 專案目標

建立一套支援即時通知的咖啡廳點餐系統，具備以下能力：

* 客人可線上點餐
* 店員可即時處理訂單
* 訂單狀態透過 WebSocket 即時更新
* 支援多角色權限控管（RBAC）
* 可部署至雲端並支援 CI/CD

---

## 1.2 技術棧

### Frontend

* Vue 3
* TypeScript
* Tailwind CSS
* Pinia
* Axios
* Vitest
* Vue Test Utils
* Playwright

### Backend

* Node.js
* Express
* Socket.io
* Jest
* Supertest
* socket.io-client

### Database

* MongoDB（Mongoose）

---

# 2. 系統架構

```
[ Vue Frontend ]
        ↓ REST API
[ Node.js / Express ]
        ↓
     [ MongoDB ]

[ Vue Client ] ←→ WebSocket ←→ [ Socket.io Server ]
```

---

# 3. 使用者角色（RBAC）

| 角色    | 權限             |
| ----- | -------------- |
| Guest | 建立訂單、查看自己的訂單 |
| User  | 建立訂單、查看自己的訂單 |
| Staff | 管理與更新訂單      |
| Admin | 管理所有資源       |

---

## 3.1 RBAC 權限矩陣

| 功能 / API                 | Guest | User | Staff | Admin |
| ------------------------ | ----- | ---- | ----- | ----- |
| 瀏覽商品列表                  | ✅     | ✅    | ✅     | ✅     |
| 使用購物車                    | ✅     | ✅    | ✅     | ✅     |
| 註冊 / 登入                 | ✅     | ✅    | ✅     | ✅     |
| 建立商品                    | ❌     | ❌    | ❌     | ✅     |
| 更新商品                    | ❌     | ❌    | ❌     | ✅     |
| 刪除商品                    | ❌     | ❌    | ❌     | ✅     |
| 建立訂單                    | ✅     | ✅    | ❌     | ✅     |
| 查看自己的訂單                 | ✅     | ✅    | ❌     | ✅     |
| 查看所有訂單                  | ❌     | ❌    | ✅     | ✅     |
| 更新訂單狀態                  | ❌     | ❌    | ✅     | ✅     |
| 查看銷售報表                  | ❌     | ❌    | ✅     | ✅     |
| 累積會員點數                  | ❌     | ✅    | ❌     | ✅     |
| 兌換會員點數                  | ❌     | ✅    | ❌     | ✅     |
| 管理使用者                   | ❌     | ❌    | ❌     | ✅     |

### 權限規則

* User 只能查看與操作自己的訂單。
* User 只能在訂單狀態為 `pending` 時取消自己的訂單。
* Guest 是提供給不想加入會員的顧客使用，訂單操作權限限於自己建立的訪客訂單。
* Guest 只能透過「訂單追蹤」查看與操作自己建立的訂單，可透過 guest token、訂單查詢碼或付款回導資訊識別訂單歸屬；Guest 不提供「點餐紀錄」頁面。
* Guest 不累積會員點數；若後續註冊會員，可提示加入會員後新訂單可在會員點餐紀錄查看完整歷史並累積點數。
* User 只能查看自己的會員點餐紀錄。
* Staff 可查看所有訂單並更新訂單狀態，但不可管理商品與使用者。
* Admin 可管理所有資源，包含商品、訂單與使用者。
* 所有需要登入的 API 都必須驗證 JWT。

---

# 4. 核心模組

---

## 4.1 Auth Module

### 功能

* 使用者註冊
* 使用者登入（JWT）
* Token 驗證

### Auth 規則

* 密碼需使用 bcrypt 雜湊後儲存，不可保存明文密碼。
* JWT payload 建議包含 `userId`、`role`。
* Access Token 用於 API 與 WebSocket 認證。
* Refresh Token 可作為未來擴充，用於延長登入狀態。
* Token 過期時回傳 `401 Unauthorized`。
* 權限不足時回傳 `403 Forbidden`。

---

## 4.2 Product Module

### 功能

* 商品列表（咖啡 / 甜點）
* 商品 CRUD（Admin）

---

## 4.3 Order Module（核心）

### 訂單狀態

```ts
type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
```

---

### 狀態轉換限制

```ts
const allowedTransitions = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
}
```

---

### 狀態邊界規則

* `completed` 與 `cancelled` 為終態，不可再轉換成其他狀態。
* User 只能將自己的 `pending` 訂單取消為 `cancelled`。
* Staff / Admin 可依照 `allowedTransitions` 更新訂單狀態。
* 每次狀態更新需記錄 `updatedAt`。
* 建議新增狀態歷史紀錄，記錄操作人與更新時間。
* 非法狀態轉換需回傳 `400 Bad Request`。

### 狀態歷史紀錄（可選）

```js
statusHistory: [
  {
    status: String,
    changedBy: ObjectId,
    changedAt: Date
  }
]
```

---

### 功能

* 建立訂單
* 查詢訂單
* 更新訂單狀態（Staff）

---

## 4.4 Notification Module（WebSocket）

### 功能

* 即時通知訂單狀態變更
* User / Guest 訂單追蹤頁即時接收狀態更新
* Staff 即時接收付款完成的新訂單
* 通知歷史紀錄

### 通知對象

* User：透過 `room:user:{userId}` 與 `room:order:{orderId}` 接收通知。
* Guest：透過 `room:order:{orderId}` 接收通知，加入 room 時需驗證 guest token 或 `orderLookupCode`。
* Staff：透過 `room:staff` 接收新訂單與訂單更新通知。

### 通知保存規則

* 會員通知以 `userId` 關聯。
* 訪客通知以 `orderId` 與 `guestOrderLookupCode` 關聯。
* 訪客重新打開訂單追蹤頁時，可透過 `orderLookupCode` 搭配 phone 或 guest token 重新查詢訂單狀態與通知歷史。

---

## 4.5 Member Points Module

### 功能

* 會員完成付款後累積點數。
* 每消費 100 元累積 1 點。
* 會員累積 3 點可換購指定商品。
* 點數以訂單實際付款金額計算。
* 未滿 100 元的金額不累積點數。
* 取消、付款失敗或退款的訂單不可累積點數。
* Guest 不累積點數，也不可兌換點數商品。

### 點數計算規則

```ts
const earnedPoints = Math.floor(paidAmount / 100)
```

### 點數兌換規則

```ts
const requiredRedeemPoints = 3
```

* 會員點數需大於等於 3 點才可兌換。
* 每次兌換固定扣除 3 點。
* 可兌換商品需由 Admin 標記為可兌換商品。
* 兌換商品不可與一般付款商品混用同一筆付款流程，MVP 建議建立獨立兌換訂單。
* 兌換成功後需寫入點數異動紀錄，避免重複扣點。

### 點數入帳時機

* Line Pay 付款成功並完成後端 confirm 後計算點數。
* 訂單付款狀態更新為 `paid` 後才可入帳。
* 點數入帳需記錄於訂單，避免重複發放。
* 兌換訂單不累積點數。

### 點數扣除時機

* 會員送出兌換訂單時，後端需檢查點數是否足夠。
* 兌換訂單建立成功後立即扣除 3 點。
* 若兌換訂單被取消，需退回已扣除點數。

---

## 4.6 Sales Report Module（銷售報表）

### 功能

* Staff / Admin 可依日、週、月、年或自訂日期區間查詢銷售數據。
* 查詢結果包含總營收、已付款訂單數、已售品項數、各時間桶的明細，以及品項銷售排行。

### 查詢區間類型

| 區間類型 | 說明 | 前端控件 |
| ------- | ---- | ------- |
| `day`   | 指定單日 | `<input type="date">` |
| `week`  | 包含指定日期的整週（週一～週日）| `<input type="date">` |
| `month` | 指定年月的整個月 | `<input type="month">` |
| `year`  | 指定整年 | `<select>` 年份 |
| `range` | 自訂開始日期 ～ 結束日期（最多 366 天）| 兩個 `<input type="date">` + 查詢按鈕 |

### 時區

所有日期邊界以台北時間（UTC+8）計算。後端統一處理時區轉換，前端只傳 `YYYY-MM-DD` 格式字串。

### 回應格式

```json
{
  "period": "week",
  "label": "2026-05-11 ~ 2026-05-17",
  "totalRevenue": 12500,
  "totalOrders": 45,
  "totalItems": 87,
  "soldItems": [
    { "productId": "...", "name": "拿鐵咖啡", "quantity": 20, "revenue": 1700 }
  ],
  "breakdown": [
    { "label": "5/11 (一)", "date": "2026-05-11", "revenue": 1800, "orders": 6, "items": 12 }
  ]
}
```

### 驗證規則

* `range` 區間：`startDate` 不可晚於 `endDate`。
* `range` 區間：最多 366 天，超過回傳 `400 DATE_RANGE_TOO_LARGE`。
* `period` 必須為 `day | week | month | year | range`，否則回傳 `400 INVALID_PERIOD`。
* 只統計 `paymentStatus = paid` 的訂單。

---

# 5. 資料庫設計（MongoDB）

---

## 5.1 User

```js
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,
  role: 'user' | 'staff' | 'admin',
  points: Number,
  createdAt: Date
}
```

### 約束

* `name`：required
* `email`：required、unique、lowercase
* `password`：required，需儲存 bcrypt hash
* `role`：enum，預設為 `user`
* `points`：會員點數，預設為 0
* 建議建立 `email` unique index

---

## 5.2 Product

```js
{
  _id: ObjectId,
  name: String,
  price: Number,
  category: 'coffee' | 'dessert',
  description: String,
  imageUrl: String,
  isAvailable: Boolean,
  isRedeemable: Boolean,
  redeemPoints: Number
}
```

### 約束

* `name`：required
* `price`：required，需大於等於 0
* `category`：enum `coffee` 或 `dessert`
* `imageUrl`：選填，商品圖片 URL（需為有效 URL 格式或空字串）
* `isAvailable`：預設為 `true`
* `isRedeemable`：是否可用點數兌換，預設為 `false`
* `redeemPoints`：兌換所需點數，可兌換商品預設為 3
* 可依 `category` 與 `isAvailable` 建立查詢 index

---

## 5.3 Order

```js
{
  _id: ObjectId,
  userId: ObjectId,
  guestInfo: {
    name: String,
    phone: String,
    email: String
  },
  orderLookupCode: String,
  guestTokenHash: String,
  guestTokenExpiresAt: Date,
  items: [
    {
      productId: ObjectId,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  totalAmount: Number,
  orderType: 'purchase' | 'redeem',
  paymentStatus: String,
  linePayTransactionId: String,
  linePayOrderId: String,
  paidAmount: Number,
  pointsEarned: Number,
  pointsRedeemed: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 約束

* `userId`：會員訂單需有值並 ref `User`；訪客訂單可為空
* `guestInfo`：訪客訂單 required，會員訂單 optional
* `orderLookupCode`：訪客訂單查詢碼，需 unique
* `guestTokenHash`：訪客訂單查詢 token 的 hash，不儲存明文 token
* `guestTokenExpiresAt`：訪客 token 有效期限，建議 7 天
* `items`：至少一筆
* `items.quantity`：需大於 0
* `totalAmount`：由後端根據商品價格計算，不接受前端直接決定
* `orderType`：一般購買為 `purchase`，點數兌換為 `redeem`
* `paymentStatus`：enum，預設為 `unpaid`
* `linePayTransactionId`：Line Pay 回傳的 transaction ID
* `linePayOrderId`：送往 Line Pay 的 merchant order ID，需 unique
* `paidAmount`：實際付款金額，付款成功後寫入
* `pointsEarned`：本訂單累積點數，預設為 0
* `pointsRedeemed`：本訂單扣除點數，預設為 0
* `status`：enum，預設為 `pending`
* 建議建立 `userId`、`status`、`createdAt` index

---

## 5.4 Notification

```js
{
  _id: ObjectId,
  userId: ObjectId,
  guestOrderLookupCode: String,
  orderId: ObjectId,
  audience: 'user' | 'guest' | 'staff',
  type: String,
  message: String,
  isRead: Boolean,
  createdAt: Date
}
```

### 約束

* `userId`：會員通知 ref `User`，訪客通知可為空
* `guestOrderLookupCode`：訪客通知使用，會員通知可為空
* `orderId`：required，ref `Order`
* `audience`：通知對象，enum `user`、`guest`、`staff`
* `type`：通知類型，例如 `order_paid`、`order_status_updated`、`order_ready`
* `message`：required
* `isRead`：預設為 `false`
* 建議建立 `userId`、`isRead`、`createdAt` index
* 建議建立 `guestOrderLookupCode`、`orderId`、`createdAt` index

---

## 5.5 Payment

```js
{
  _id: ObjectId,
  orderId: ObjectId,
  provider: 'line_pay',
  transactionId: String,
  merchantOrderId: String,
  amount: Number,
  currency: String,
  status: String,
  rawRequest: Object,
  rawResponse: Object,
  confirmedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 約束

* `orderId`：required，ref `Order`
* `provider`：enum，目前固定為 `line_pay`
* `transactionId`：Line Pay transaction ID
* `merchantOrderId`：系統產生並送往 Line Pay 的訂單編號，需 unique
* `amount`：付款金額，需等於訂單應付金額
* `currency`：預設 `TWD`
* `status`：對應付款狀態，例如 `payment_pending`、`paid`、`payment_failed`、`refunded`
* `rawRequest` / `rawResponse`：保留第三方請求與回應摘要，便於除錯與對帳
* 建議建立 `orderId`、`transactionId`、`merchantOrderId` index

---

# 6. API 規格

---

## 6.1 Auth

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### POST /api/auth/register

Request:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "userId",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "user"
  },
  "accessToken": "jwt-token"
}
```

### POST /api/auth/login

Request:

```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "userId",
    "name": "Alice",
    "role": "user"
  },
  "accessToken": "jwt-token"
}
```

### GET /api/auth/me

需帶 Bearer token。回傳目前登入使用者的最新資料（從 DB 查詢，包含最新 `points`）。

Response:

```json
{
  "id": "userId",
  "name": "Alice",
  "email": "alice@example.com",
  "role": "user",
  "points": 3
}
```

---

## 6.2 Product

```
GET /api/products
POST /api/products (admin)
PUT /api/products/:id (admin)
DELETE /api/products/:id (admin)
```

### GET /api/products

Query:

```http
GET /api/products?category=coffee&available=true&page=1&limit=20
```

Response:

```json
{
  "data": [
    {
      "id": "productId",
      "name": "Latte",
      "price": 120,
      "category": "coffee",
      "description": "Milk coffee",
      "imageUrl": "https://images.unsplash.com/photo-1509042239860?w=400",
      "isAvailable": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### POST /api/products

Request:

```json
{
  "name": "Latte",
  "price": 120,
  "category": "coffee",
  "description": "Milk coffee",
  "imageUrl": "https://images.unsplash.com/photo-1509042239860?w=400",
  "isAvailable": true
}
```

---

## 6.3 Order

```
POST   /api/orders
POST   /api/orders/guest
POST   /api/orders/redeem
GET    /api/orders/my
GET    /api/orders                              staff/admin（支援 ?date=YYYY-MM-DD 日期篩選與 ?all=true 完整清單）
GET    /api/orders/summary/today                staff/admin（支援 ?date=YYYY-MM-DD）
GET    /api/orders/sales                        staff/admin
GET    /api/orders/:id
GET    /api/orders/guest/:lookupCode
PATCH  /api/orders/:id/status
```

### POST /api/orders

Request:

```json
{
  "items": [
    {
      "productId": "productId",
      "quantity": 2
    }
  ]
}
```

Response:

```json
{
  "id": "orderId",
  "userId": "userId",
  "items": [
    {
      "productId": "productId",
      "name": "Latte",
      "price": 120,
      "quantity": 2
    }
  ],
  "totalAmount": 240,
  "status": "pending",
  "createdAt": "2026-05-13T00:00:00.000Z"
}
```

### POST /api/orders/guest

訪客不需登入即可建立訂單，但需提供聯絡資訊。後端需產生 `orderLookupCode` 與可選的 guest token，用於付款回導、訂單查詢與 WebSocket room 驗證。

Request:

```json
{
  "guestInfo": {
    "name": "Guest Alice",
    "phone": "0912345678",
    "email": "guest@example.com"
  },
  "items": [
    {
      "productId": "productId",
      "quantity": 2
    }
  ]
}
```

Response:

```json
{
  "id": "orderId",
  "orderLookupCode": "A1B2C3D4",
  "guestToken": "guest-token",
  "totalAmount": 240,
  "status": "pending",
  "paymentStatus": "unpaid"
}
```

### GET /api/orders

Staff / Admin 查詢訂單，可用於訂單管理頁與完整點餐紀錄。支援 `date`（台北時間 `YYYY-MM-DD`）篩選當日訂單；若未傳 `date`、`status`、`paymentStatus`、`all=true`，預設回傳 `paymentStatus=paid & status=pending` 的待處理訂單。若傳入 `all=true`，則回傳完整訂單清單，供 staff/admin 的點餐紀錄頁使用。

Query:

```http
GET /api/orders?status=pending&paymentStatus=paid&page=1&limit=20
GET /api/orders?date=2026-05-18
GET /api/orders?all=true
```

### GET /api/orders/summary/today

Staff / Admin 查詢今日（或指定日期）訂單彙總統計，包含營收、訂單數、品項數及各狀態計數。

Query:

```http
GET /api/orders/summary/today
GET /api/orders/summary/today?date=2026-05-10
```

Response:

```json
{
  "date": "2026-05-18",
  "timezone": "Asia/Taipei",
  "totalOrders": 12,
  "paidOrders": 10,
  "paidRevenue": 8500,
  "averagePaidOrderValue": 850,
  "itemQuantity": 22,
  "soldItems": [
    { "productId": "...", "name": "拿鐵咖啡", "quantity": 8, "revenue": 680 }
  ],
  "guestOrders": 4,
  "memberOrders": 8,
  "statusCounts": { "pending": 2, "accepted": 1, "preparing": 1, "ready": 0, "completed": 8, "cancelled": 0 },
  "paymentStatusCounts": { "unpaid": 1, "payment_pending": 1, "paid": 10, "payment_failed": 0, "refunded": 0 }
}
```

### GET /api/orders/sales

Staff / Admin 查詢銷售報表，依區間類型回傳各時間桶的明細與品項排行。詳見 4.6 Sales Report Module。

Query:

```http
GET /api/orders/sales?period=day&date=2026-05-18
GET /api/orders/sales?period=week&date=2026-05-18
GET /api/orders/sales?period=month&year=2026&month=5
GET /api/orders/sales?period=year&year=2026
GET /api/orders/sales?period=range&startDate=2026-05-01&endDate=2026-05-18
```

Response: 詳見 4.6 Sales Report Module 回應格式。

### GET /api/orders/guest/:lookupCode

訪客查詢自己的訂單。實作時建議要求同時提供 `phone` 或 guest token，避免只靠查詢碼被猜中。
訪客模式不提供「點餐紀錄」頁面；若需完整歷史紀錄，需註冊/登入會員後建立會員訂單。

Query:

```http
GET /api/orders/guest/A1B2C3D4?phone=0912345678
```

Response:

```json
{
  "id": "orderId",
  "orderLookupCode": "A1B2C3D4",
  "items": [],
  "totalAmount": 240,
  "status": "preparing",
  "paymentStatus": "paid"
}
```

### POST /api/orders/redeem

會員使用 3 點兌換指定商品。此 API 需登入，Guest 不可使用。

Request:

```json
{
  "productId": "productId"
}
```

Response:

```json
{
  "id": "orderId",
  "orderType": "redeem",
  "items": [
    {
      "productId": "productId",
      "name": "Redeem Coffee",
      "price": 0,
      "quantity": 1
    }
  ],
  "pointsRedeemed": 3,
  "remainingPoints": 7,
  "status": "pending",
  "paymentStatus": "paid"
}
```

Backend 行為：

* 驗證目前使用者為 User。
* 驗證商品 `isRedeemable = true`。
* 驗證 User.points >= 3。
* 建立 `orderType = redeem` 的兌換訂單。
* 扣除 User.points 3 點。
* 寫入 `pointsRedeemed = 3`。
* 兌換訂單不進入 Line Pay 付款流程，`paymentStatus` 可直接標記為 `paid`。
* 通知 `room:staff` 有新兌換訂單。

### PATCH /api/orders/:id/status

Request:

```json
{
  "status": "accepted"
}
```

Response:

```json
{
  "id": "orderId",
  "status": "accepted",
  "updatedAt": "2026-05-13T00:05:00.000Z"
}
```

### API 錯誤格式

```json
{
  "message": "Invalid order status transition",
  "code": "INVALID_STATUS_TRANSITION"
}
```

### 常見 HTTP Status Code

| 狀態碼 | 說明 |
| ---- | ---- |
| 200  | 成功 |
| 201  | 建立成功 |
| 400  | 請求資料錯誤 |
| 401  | 未登入或 Token 無效 |
| 403  | 權限不足 |
| 404  | 資源不存在 |
| 409  | 資源衝突，例如 Email 已存在 |
| 500  | 伺服器錯誤 |

---

## 6.4 Notification

```http
GET    /api/notifications
GET    /api/notifications/guest/:lookupCode
PATCH  /api/notifications/:id/read
POST   /api/notifications/push/subscribe
DELETE /api/notifications/push/unsubscribe
```

### GET /api/notifications

會員查詢自己的通知歷史。

Response:

```json
{
  "data": [
    {
      "id": "notificationId",
      "orderId": "orderId",
      "type": "order_status_updated",
      "message": "Your order is preparing",
      "isRead": false,
      "createdAt": "2026-05-13T00:12:00.000Z"
    }
  ]
}
```

### GET /api/notifications/guest/:lookupCode

訪客查詢自己的訂單通知歷史。需搭配 `phone` 或 guest token 驗證。

Query:

```http
GET /api/notifications/guest/A1B2C3D4?phone=0912345678
```

Response:

```json
{
  "orderId": "orderId",
  "notifications": [
    {
      "id": "notificationId",
      "type": "order_ready",
      "message": "Your order is ready",
      "isRead": false,
      "createdAt": "2026-05-13T00:15:00.000Z"
    }
  ]
}
```

### PATCH /api/notifications/:id/read

將通知標記為已讀。會員需驗證 `userId`，訪客需驗證該通知對應的 `orderLookupCode` 與 guest token / phone。

Response:

```json
{
  "id": "notificationId",
  "isRead": true
}
```

### POST /api/notifications/push/subscribe

需登入（User）。儲存 Web Push 訂閱物件（endpoint + keys）。同一 endpoint 重複訂閱為冪等操作（201）。

Request:

```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

Response: `{ "ok": true }`

### DELETE /api/notifications/push/unsubscribe

需登入（User）。移除指定 endpoint 的訂閱記錄。

Request body: `{ "endpoint": "https://..." }`

Response: `{ "ok": true }`

若 endpoint 不存在，回傳 `404 SUBSCRIPTION_NOT_FOUND`。

---

## 6.5 Payment / Line Pay

本系統以 Line Pay 作為主要付款方式。後端需封裝 Line Pay API，不讓前端直接呼叫 Line Pay channel secret。

### Line Pay 外部 API

| 用途 | Method | Path |
| ---- | ------ | ---- |
| 建立付款請求 | POST | `/v4/payments/request` |
| 查詢付款請求狀態 | GET | `/v4/payments/requests/{transactionId}/check` |
| 確認付款 | POST | `/v4/payments/{transactionId}/confirm` |
| 查詢付款明細 | GET | `/v4/payments` |
| 退款 | POST | `/v4/payments/{transactionId}/refund` |

### Line Pay API Host

```txt
Sandbox: https://sandbox-api-pay.line.me
Production: https://api-pay.line.me
```

### Line Pay Request Header

後端呼叫 Line Pay API 時需產生簽章，基本 header 包含：

```http
Content-Type: application/json
X-LINE-ChannelId: <channel-id>
X-LINE-Authorization-Nonce: <nonce>
X-LINE-Authorization: <signature>
```

簽章產生邏輯需集中封裝於 `linePay.client.ts`，避免散落在 controller 或 service。

### 系統 API

```http
POST /api/payments/line-pay/request
POST /api/payments/line-pay/confirm
GET /api/payments/line-pay/cancel
```

### POST /api/payments/line-pay/request

建立 Line Pay 付款請求。會員與訪客都可使用，但必須是自己的訂單。

Request:

```json
{
  "orderId": "orderId"
}
```

Response:

```json
{
  "paymentUrl": "https://...",
  "transactionId": "line-pay-transaction-id",
  "paymentStatus": "payment_pending"
}
```

Backend 行為：

* 驗證訂單存在且屬於目前 User 或 Guest。
* 驗證訂單尚未付款。
* 建立 `merchantOrderId`。
* 呼叫 Line Pay `POST /v4/payments/request`。
* 儲存 `transactionId`、`merchantOrderId` 與 Payment 紀錄。
* 將訂單 `paymentStatus` 更新為 `payment_pending`。
* 回傳 Line Pay 付款頁 URL 給前端。

### POST /api/payments/line-pay/confirm

Line Pay 付款完成後採用單一路徑處理 confirm：

```txt
1. Line Pay redirect 使用者回到前端 confirm page
2. 前端從 redirect query 取得 transactionId 與 orderId
3. 前端呼叫 backend confirm API
4. Backend 呼叫 Line Pay confirm API
5. Backend 更新 Payment、Order、Point 與 Notification
6. 前端導向訂單追蹤頁
```

後端仍需保證 confirm API 具備冪等性，避免使用者重新整理 confirm page 時重複入帳。

Request:

```json
{
  "transactionId": "line-pay-transaction-id",
  "orderId": "orderId"
}
```

Response:

```json
{
  "orderId": "orderId",
  "paymentStatus": "paid",
  "paidAmount": 240,
  "pointsEarned": 2
}
```

Backend 行為：

* 驗證 `transactionId` 與訂單對應。
* 呼叫 Line Pay `POST /v4/payments/{transactionId}/confirm`。
* 確認付款金額與訂單金額一致。
* 將 Payment 狀態更新為 `paid`。
* 將 Order `paymentStatus` 更新為 `paid`。
* 若為會員訂單，依 `Math.floor(paidAmount / 100)` 累積會員點數。
* 通知 `room:staff` 有新付款完成訂單。
* 通知對應訂單 room 付款狀態已更新。

### GET /api/payments/line-pay/cancel

使用者取消 Line Pay 付款後導回。

Query:

```http
GET /api/payments/line-pay/cancel?orderId=orderId
```

Backend 行為：

* 保留原訂單。
* 將 `paymentStatus` 更新為 `payment_failed` 或維持 `unpaid`，依實作策略決定。
* 前端顯示重新付款或取消訂單選項。

### Line Pay 環境變數

```env
LINE_PAY_CHANNEL_ID=your-channel-id
LINE_PAY_CHANNEL_SECRET=your-channel-secret
LINE_PAY_API_BASE_URL=https://sandbox-api-pay.line.me
LINE_PAY_CONFIRM_URL=https://your-domain.com/payments/line-pay/confirm
LINE_PAY_CANCEL_URL=https://your-domain.com/payments/line-pay/cancel
```

### 安全規則

* `LINE_PAY_CHANNEL_SECRET` 只能存在後端環境變數。
* 前端不可直接呼叫 Line Pay request / confirm API。
* Confirm 流程需具備冪等性，重複 confirm 不可重複加點。
* 付款金額必須由後端訂單金額決定，不可使用前端傳入金額。
* 付款成功後才允許 Staff 正式接單。

---

# 7. WebSocket 設計

---

## 7.1 房間設計

```
room:user:{userId}
room:order:{orderId}
room:staff
```

### 房間權限

* User 只能加入自己的 `room:user:{userId}`。
* User 只能加入自己訂單的 `room:order:{orderId}`。
* Guest 可加入自己訂單的 `room:order:{orderId}`，需提供 guest token 或訂單查詢碼驗證。
* Staff / Admin 可加入 `room:staff` 與任一訂單 room。
* Server 必須驗證 socket 身分後才允許加入 room。

---

## 7.2 事件

### Client → Server

```
join_room
get_notifications
mark_notification_read
```

Payload:

```json
{
  "room": "room:order:orderId"
}
```

---

### Server → Client

```
order_updated
notification
notifications_loaded
```

`order_updated` Payload:

```json
{
  "orderId": "orderId",
  "status": "preparing",
  "updatedAt": "2026-05-13T00:10:00.000Z"
}
```

`notification` Payload:

```json
{
  "orderId": "orderId",
  "audience": "guest",
  "type": "order_ready",
  "message": "Your order is ready",
  "createdAt": "2026-05-13T00:15:00.000Z"
}
```

`notifications_loaded` Payload:

```json
{
  "orderId": "orderId",
  "notifications": [
    {
      "id": "notificationId",
      "type": "order_status_updated",
      "message": "Your order is preparing",
      "isRead": false,
      "createdAt": "2026-05-13T00:12:00.000Z"
    }
  ]
}
```

### 訪客通知流程

```txt
1. Guest 完成付款後進入訂單追蹤頁
2. Client 使用 guest token 或 orderLookupCode + phone 驗證
3. 驗證成功後加入 room:order:{orderId}
4. Staff 更新訂單狀態
5. Server 寫入 Notification
6. Server emit order_updated 與 notification 給 room:order:{orderId}
7. Guest UI 即時顯示最新狀態與通知
8. 若 Guest 重新開啟追蹤頁，Client 呼叫 REST API 或 get_notifications 重新取得通知歷史
```

---

## 7.3 流程

```
1. User 登入或 Guest 建立訂單後取得 guest token / orderLookupCode
2. User 加入 room:user:{userId} 與 room:order:{orderId}
3. Guest 只加入自己的 room:order:{orderId}
4. Staff 加入 room:staff
5. Staff 更新訂單狀態
6. Server emit order_updated / notification
7. Client 即時更新 UI
```

## 7.4 WebSocket 認證

Client 建立連線時需帶入 JWT：

```ts
io("https://api.example.com", {
  auth: {
    token: "jwt-token"
  }
})
```

Server 需於 connection middleware 驗證 token：

* Token 有效：將 `userId`、`role` 存入 socket context。
* Guest token 或訂單查詢碼有效：只允許加入對應訂單 room。
* Token 或查詢碼無效：拒絕連線或拒絕加入 room。
* 斷線重連後，Client 需重新加入必要 room 並重新拉取最新訂單狀態。

---

# 8. 付款狀態與訂單狀態關係

## 8.1 PaymentStatus

```ts
type PaymentStatus =
  | 'unpaid'
  | 'payment_pending'
  | 'paid'
  | 'payment_failed'
  | 'refunded'
```

## 8.2 狀態關係規則

| paymentStatus     | order status 可用狀態                    | 說明 |
| ----------------- | ---------------------------------------- | ---- |
| `unpaid`          | `pending`, `cancelled`                   | 已建立訂單但尚未進入付款或尚未付款 |
| `payment_pending` | `pending`, `cancelled`                   | 已建立 Line Pay 請求，等待付款結果 |
| `paid`            | `pending`, `accepted`, `preparing`, `ready`, `completed` | 付款成功後，Staff 才可正式處理 |
| `payment_failed`  | `pending`, `cancelled`                   | 付款失敗，可重新付款或取消訂單 |
| `refunded`        | `cancelled`                              | 已退款，訂單不可再處理 |

## 8.3 業務規則

* Staff 訂單管理頁預設只顯示 `paymentStatus = paid` 且 `status = pending` 的新訂單。
* 未付款訂單不可從 `pending` 轉為 `accepted`。
* 付款失敗的訂單可重新建立 Line Pay 付款請求。
* 付款成功後不可再次建立付款請求。
* 會員點數只在 `paymentStatus` 第一次轉為 `paid` 時入帳。
* 若未來支援退款，退款成功後需將 `paymentStatus` 更新為 `refunded`，並扣回該訂單已發放點數。

---

# 9. 前端頁面設計

---

## User

* 商品列表頁（`/products`）— 骨架屏載入、分類篩選
* 購物車頁 / 結帳頁（`/checkout`）— 訪客/會員結帳
* 點餐紀錄頁（`/orders/my`）— 可收合訂單卡、狀態步驟條、即時更新、推播通知開關
* 訂單追蹤頁（`/orders/guest`）— 訪客輸入查詢碼、左右雙欄、狀態步驟條
* 我的點數頁（`/points`）— 點數餘額、進度條、可兌換商品列表、點數紀錄歷史

---

## Staff

* 員工訂單頁（`/staff/orders`）— 顯示待處理已付款訂單，支援接單/製作/完成狀態轉換
* 銷售報表頁（`/staff/sales`）— 依日/週/月/年/自訂區間查詢銷售數據，含品項銷售排行

---

## Admin

* 商品管理頁（`/admin/products`）— 商品 CRUD，支援圖片預覽與可兌換設定
* 使用者管理頁（`/admin/users`）— 查看所有使用者並變更角色
* Admin 同時擁有 Staff 頁面的完整存取權

---

## 9.1 前端狀態管理（Pinia）

### authStore

* 保存登入使用者資料（含 `points` 點數餘額）
* 保存 access token
* login / logout / `refreshUser()`（呼叫 `/api/auth/me` 更新最新點數）
* 驗證目前角色權限

### cartStore

* 管理購物車商品
* 計算總金額
* 建立訂單後清空購物車

### orderStore

* 查詢訂單列表
* 查詢訂單詳情
* 接收 WebSocket 訂單狀態更新
* 更新本地訂單狀態

### notificationStore

* 查詢會員通知歷史
* 查詢訪客訂單通知歷史
* 接收 WebSocket `notification`
* 標記通知已讀
* 依 `orderId` 分組顯示通知

### socketStore

* 建立與關閉 Socket.io 連線
* 管理 join room
* 統一監聽 `order_updated` 與 `notification`

### toastStore

* `success(msg)` / `error(msg)` / `info(msg)` 顯示浮動 Toast
* 自動 3.5 秒後消失
* `ToastContainer` 全域掛載於 `App.vue`

### confirmStore

* Promise-based `confirm(opts): Promise<boolean>`
* `ConfirmDialog` 全域掛載於 `App.vue`，支援 ESC 關閉與 danger 模式

### Web Push

* `usePushNotification` composable 封裝 Service Worker 訂閱邏輯
* `/sw.js` 處理 `push` 與 `notificationclick` 事件
* VAPID 金鑰需設定 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`（未設定則靜默略過）
* 訂單狀態變為 `ready` 時後端自動推播給訂單會員

### Token 儲存策略

* MVP 可使用 localStorage 儲存 access token。
* 若要提高安全性，可改用 httpOnly cookie。
* logout 時需清除 token、使用者狀態與 socket 連線。

## 9.2 前端路由與權限守衛

| Route | 允許角色 | Guard 規則 |
| ----- | -------- | ---------- |
| `/products` | Guest / User / Staff / Admin | 公開頁面 |
| `/cart` | Guest / User | 公開購物流程 |
| `/checkout` | Guest / User | Guest 可直接結帳，User 使用會員資料 |
| `/login` | Guest | 已登入者導向 `/products` |
| `/register` | Guest | 已登入者導向 `/products` |
| `/orders/my` | User / Staff / Admin | 需登入，僅顯示自己的訂單 |
| `/points` | User | 需登入且 role 為 `user`，顯示點數餘額與兌換頁 |
| `/orders/guest` | Guest / User | 需搭配 phone 或 guest token 驗證 |
| `/payments/line-pay/confirm` | Guest / User | Line Pay redirect 頁，負責呼叫 backend confirm API |
| `/payments/line-pay/cancel` | Guest / User | Line Pay cancel 頁，顯示重新付款或取消訂單 |
| `/staff/orders` | Staff / Admin | 需登入且 role 為 `staff` 或 `admin` |
| `/staff/sales`  | Staff / Admin | 需登入且 role 為 `staff` 或 `admin` |
| `/admin/products` | Admin | 需登入且 role 為 `admin` |
| `/admin/users` | Admin | 需登入且 role 為 `admin` |

### Route Guard 規則

* Guest route 不需 JWT。
* User route 需驗證 JWT 與訂單歸屬。
* Staff route 需驗證 JWT 與角色。
* Admin route 需驗證 JWT 與 `admin` 角色。
* Guest order route 需驗證 `orderLookupCode` 搭配 phone 或 guest token。

---

# 10. 前後端專案結構

## 10.1 Backend 專案結構

```txt
backend/
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  │  ├─ database.ts
│  │  ├─ env.ts
│  │  └─ linePay.ts
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.routes.ts
│  │  │  ├─ auth.service.ts
│  │  │  └─ auth.validators.ts
│  │  ├─ users/
│  │  │  ├─ user.model.ts
│  │  │  ├─ user.service.ts
│  │  │  └─ user.routes.ts
│  │  ├─ products/
│  │  │  ├─ product.model.ts
│  │  │  ├─ product.controller.ts
│  │  │  ├─ product.routes.ts
│  │  │  └─ product.service.ts
│  │  ├─ orders/
│  │  │  ├─ order.model.ts
│  │  │  ├─ order.controller.ts
│  │  │  ├─ order.routes.ts
│  │  │  ├─ order.service.ts
│  │  │  └─ orderStatus.ts
│  │  ├─ payments/
│  │  │  ├─ payment.model.ts
│  │  │  ├─ linePay.client.ts
│  │  │  ├─ payment.controller.ts
│  │  │  ├─ payment.routes.ts
│  │  │  └─ payment.service.ts
│  │  ├─ points/
│  │  │  └─ point.service.ts
│  │  └─ notifications/
│  │     ├─ notification.model.ts
│  │     └─ notification.service.ts
│  ├─ middlewares/
│  │  ├─ auth.middleware.ts
│  │  ├─ rbac.middleware.ts
│  │  ├─ error.middleware.ts
│  │  └─ validate.middleware.ts
│  ├─ sockets/
│  │  ├─ socket.server.ts
│  │  ├─ socket.auth.ts
│  │  └─ order.socket.ts
│  ├─ utils/
│  │  ├─ ApiError.ts
│  │  └─ asyncHandler.ts
│  └─ tests/
├─ package.json
└─ tsconfig.json
```

### Backend 分層規則

* `routes`：只負責定義路由與 middleware。
* `controller`：處理 request / response，不放商業邏輯。
* `service`：處理商業邏輯，例如訂單狀態、付款、點數。
* `model`：定義 Mongoose schema。
* `middlewares`：處理認證、權限、驗證與錯誤。
* `sockets`：集中管理 Socket.io 連線、驗證與事件。

## 10.2 Frontend 專案結構

```txt
frontend/
├─ src/
│  ├─ main.ts
│  ├─ App.vue
│  ├─ tailwind.css
│  ├─ router/
│  │  ├─ index.ts
│  │  └─ guards.ts
│  ├─ api/
│  │  ├─ http.ts
│  │  ├─ auth.api.ts
│  │  ├─ product.api.ts
│  │  ├─ order.api.ts
│  │  ├─ notification.api.ts
│  │  └─ payment.api.ts
│  ├─ stores/
│  │  ├─ auth.store.ts
│  │  ├─ cart.store.ts
│  │  ├─ notification.store.ts
│  │  ├─ order.store.ts
│  │  └─ socket.store.ts
│  ├─ socket/
│  │  ├─ socket.ts
│  │  └─ orderSocket.ts
│  ├─ views/
│  │  ├─ auth/
│  │  │  ├─ LoginView.vue
│  │  │  └─ RegisterView.vue
│  │  ├─ shop/
│  │  │  ├─ ProductListView.vue
│  │  │  ├─ CartView.vue
│  │  │  └─ CheckoutView.vue
│  │  ├─ orders/
│  │  │  ├─ MyOrdersView.vue
│  │  │  ├─ PointsView.vue
│  │  │  └─ GuestOrderTrackingView.vue
│  │  ├─ staff/
│  │  │  ├─ StaffOrdersView.vue
│  │  │  └─ SalesReportView.vue
│  │  └─ admin/
│  │     ├─ AdminProductsView.vue
│  │     └─ AdminUsersView.vue
│  ├─ components/
│  ├─ types/
│  └─ utils/
├─ package.json
└─ vite.config.ts
```

### Frontend 分層規則

* `api`：集中封裝 REST API。
* `stores`：管理登入、購物車、訂單與 socket 狀態。
* `socket`：集中封裝 Socket.io client。
* `views`：頁面層，只組合 store、api 與 components。
* `router/guards.ts`：處理會員、Staff、Admin 權限守衛。
* 訪客流程不可依賴 auth store，需透過 guest token 或 order lookup code 查詢訂單。

---

# 11. 開發階段規劃

---

## Phase 1：基礎前台與認證

### 目標

* FS-001：瀏覽商品列表
* FS-002：使用購物車
* FS-003：會員註冊
* FS-004：會員登入

---

## Phase 2：訂單建立

### 目標

* FS-005：建立會員訂單
* FS-006：建立訪客訂單
* 建立訂單查詢碼與 guest token 驗證流程

---

## Phase 3：Line Pay 付款

### 目標

* FS-007：建立 Line Pay 付款請求
* FS-008：確認 Line Pay 付款
* 完成付款狀態更新與冪等 confirm

---

## Phase 4：訂單處理與即時通知

### 目標

* FS-009：店員處理訂單
* FS-010：訂單即時通知
* 完成 WebSocket room 權限驗證

---

## Phase 5：會員點數

### 目標

* FS-011：會員點數入帳
* FS-015：會員點數兌換商品
* 完成重複 confirm 不重複加點
* 完成 3 點兌換指定商品與扣點

---

## Phase 6：後台管理

### 目標

* FS-012：商品管理
* FS-013：使用者管理
* 完成 Admin route guard 與 RBAC 驗證

---

## Phase 7：測試、部署與 CI/CD

### 目標

* 完成 Test Specifications 中列出的測試案例 ✅
* API 文件整理（Swagger） ✅
* 雲端部署 ✅
* 容器化部署規格 ✅
* GitHub Actions CI/CD ✅

### 實際部署架構

* Frontend：Vercel — `https://coffee-ordering-system-delta.vercel.app`
* Backend：Docker container on Render — `https://coffee-ordering-system-60aw.onrender.com`
* Database：MongoDB Atlas（M0 Free，Singapore region）
* Local development：Docker Compose 啟動 Frontend + Backend + MongoDB（`docker-compose up --build`）

### 建議部署架構

* Frontend：Vercel 或 Nginx static container
* Backend：Docker container on Render / AWS EC2 / container platform
* Database：MongoDB Atlas
* Local development：Docker Compose 可啟動 Frontend + Backend + MongoDB，Frontend 也可用本機 Vite 開發模式

---

### CI/CD 工具

* GitHub Actions（`.github/workflows/ci.yml`）

---

### Pipeline

兩個平行 job，push 或 PR 到 `main` 時觸發：

```
backend job:  npm ci → lint → Jest test (MongoMemoryServer) → build
frontend job: npm ci → lint → Vitest unit → Playwright E2E (Chromium) → build
```

兩個 job 皆通過才可合併。前端 E2E 使用 `page.route()` mock 攔截，不需執行真實後端。

### Swagger API 文件

* 路徑：`/api-docs`（Swagger UI）、`/api-docs.json`（raw OpenAPI JSON）
* 實作：`swagger-jsdoc` + `swagger-ui-express`，JSDoc 標註於各 route 檔案
* 線上網址：`https://coffee-ordering-system-60aw.onrender.com/api-docs`

### Demo 資料 Seed

* 腳本：`backend/src/scripts/seed.ts`
* 指令：`MONGODB_URI=<atlas-uri> npm run seed`
* 建立 3 個展示帳號（admin / staff / user）與 10 個商品（含 Unsplash 圖片 URL）

---

# 12. 環境變數與部署設定

## 12.1 Backend `.env`

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster/db
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
LINE_PAY_CHANNEL_ID=your-channel-id
LINE_PAY_CHANNEL_SECRET=your-channel-secret
LINE_PAY_API_BASE_URL=https://sandbox-api-pay.line.me
LINE_PAY_CONFIRM_URL=http://localhost:5173/payments/line-pay/confirm
LINE_PAY_CANCEL_URL=http://localhost:5173/payments/line-pay/cancel
# Web Push（選填，未設定則推播功能靜默略過）
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=admin@example.com
```

產生 VAPID 金鑰：`cd backend && npx web-push generate-vapid-keys`

## 12.2 Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
# Web Push（需與 backend VAPID_PUBLIC_KEY 相同）
VITE_VAPID_PUBLIC_KEY=
```

## 12.3 CORS 與 WebSocket

* Backend REST API 需允許 Frontend domain。
* Socket.io 需設定相同的 `CLIENT_ORIGIN`。
* 雲端部署後需確認 HTTPS 與 WebSocket 連線可正常升級。
* Render / EC2 上需確認環境變數與 MongoDB Atlas IP allowlist。

## 12.4 容器化部署規格

### Backend container

* Backend 必須提供 `backend/Dockerfile`。
* Production image 必須執行編譯後的 `dist/server.js`，不可用 `ts-node-dev` 或 dev server 啟動 production。
* Image build 必須使用 `npm ci`，並以 lockfile 為準。
* Container 不得內建 `.env`、JWT secret、Line Pay secret 或 MongoDB credential。
* 所有 runtime configuration 必須透過環境變數注入。
* Container 必須 expose Backend `PORT`，預設為 `3000`。
* Container 啟動前不應依賴本機檔案路徑或全域 npm package。

### Frontend container

* Frontend 若部署至 Vercel，可使用平台原生 build/deploy；若部署至容器平台，使用 `frontend/Dockerfile`。
* Frontend production image 應先執行 `npm run build`，再用 Nginx 提供 `dist/`。
* Nginx 必須支援 Vue Router history mode，使用 `try_files $uri $uri/ /index.html` 避免重新整理或直接進入內頁時出現 404。
* `VITE_API_BASE_URL` 與 `VITE_SOCKET_URL` 必須依部署目標設定，不得寫死 localhost。

### Docker Compose

* 專案應提供 root-level `docker-compose.yml` 作為 local integration environment。
* Compose 至少應支援 Frontend + Backend + MongoDB。
* Frontend service 對外提供 `5173:80`，容器內由 Nginx 服務靜態檔。
* Compose 只作為 local / staging-like 驗證用途，不等同 production 架構。
* Production database 應使用 MongoDB Atlas 或雲端託管資料庫，不應使用 compose 內的 MongoDB。

### Docker ignore

* Backend 與 Frontend 必須提供 `.dockerignore` 或共用 ignore 規則。
* Docker build context 不可包含：
  * `node_modules/`
  * `dist/`
  * `.env`
  * test reports
  * Playwright artifacts
  * Git metadata

### Container verification

* CI/CD 在容器化完成後必須至少執行：
  * `npm ci`
  * lint
  * unit / integration tests
  * build
  * Docker image build
* Backend container 必須可透過 `/health` 驗證啟動成功。
* 容器化變更不得降低既有 Jest、Vitest、Playwright 測試覆蓋。

### CORS 固定規則

前後端分離部署時，Backend 必須明確設定 CORS，避免瀏覽器阻擋 API 與 WebSocket 請求。

```ts
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Token'],
  credentials: true,
}
```

### 允許來源

| Environment | CLIENT_ORIGIN |
| ----------- | ------------- |
| Local | `http://localhost:5173` |
| Staging | `https://staging.example.com` |
| Production | `https://coffee-order.example.com` |

### CORS 規則

* Backend 不可使用 `origin: *`。
* Backend 只能允許 `CLIENT_ORIGIN` 中設定的前端網域。
* REST API 與 Socket.io 必須使用相同的 allowed origin。
* 若使用 `Authorization` header 傳 JWT，必須允許 `Authorization` header。
* 若 Guest 使用 header 傳 token，必須允許 `X-Guest-Token` header。
* 若使用 cookie，必須設定 `credentials: true`，前端 Axios 也需設定 `withCredentials: true`。
* Line Pay redirect URL 必須指向 Frontend domain，再由 Frontend 呼叫 Backend confirm API。
* Preflight `OPTIONS` request 必須正常回應。

### Socket.io CORS

```ts
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
})
```

### Axios 設定

```ts
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
})
```

---

# 13. 測試規劃

## 13.0 測試工具

### Frontend

* Unit Test：Vitest
* Component Test：Vue Test Utils
* E2E Test：Playwright

### Backend

* Unit Test：Jest
* API Integration Test：Jest + Supertest
* WebSocket Test：Jest + socket.io-client

## 13.1 Unit Test

* Auth service：密碼雜湊、登入驗證、JWT 產生。
* Order service：訂單金額計算、狀態轉換規則。
* Payment service：付款金額驗證、confirm 冪等性、付款狀態更新。
* Point service：每 100 元累積 1 點、未滿 100 元不累積、Guest 不累積點數、3 點兌換商品。
* RBAC middleware：不同角色權限檢查。

## 13.2 Integration Test

* Auth API：註冊、登入、Token 驗證。
* Product API：Admin CRUD 與一般使用者拒絕存取。
* Order API：建立訂單、查詢訂單、更新狀態。

## 13.3 WebSocket Test

* 使用有效 JWT 連線成功。
* 使用無效 JWT 連線失敗。
* 訂單狀態更新後正確 emit `order_updated`。
* 使用者不可加入不屬於自己的 room。

## 13.4 E2E Test

* User 登入後建立訂單。
* Staff 接收新訂單並更新狀態。
* User 訂單追蹤頁即時更新。
* Guest 訂單追蹤頁即時更新並可查詢通知歷史。
* 訂單完成後不可再修改狀態。

---

# 14. 未來擴充（加分項目）

* 訂單 Queue（排隊系統）
* 預估完成時間（ETA）
* 推播系統（Email / Push）
* Redis（快取 / PubSub）
* Nginx（反向代理）

---

# 15. 成功標準

* 訂單流程完整且不可錯誤跳轉
* WebSocket 可即時通知
* 系統可部署並運行於雲端 ✅（Render + Vercel + MongoDB Atlas）
* API 有文件（Swagger 可選）✅（`/api-docs`）
* 具備基本單元測試與整合測試
* 權限控管符合 RBAC 規則
* 對應 `AC-010`：訂單狀態更新後，User / Guest 追蹤頁應於 1 秒內更新。
* 對應 `TC-006`：Line Pay confirm 重複執行不可重複加點。
* 對應 `TC-014`：Line Pay confirm 金額不一致時，不可將訂單更新為 `paid`。
* 對應 `TC-015`：Guest 付款成功不可累積會員點數。
* 對應 `BR-003`：未付款訂單不可被 Staff 接單。

---

# 16. 系統邊界與非目標

## 16.1 本版開發範圍

本版系統以「咖啡廳線上點餐、即時訂單處理、Line Pay 付款」為核心，開發範圍包含：

* 使用者註冊、登入與 JWT 權限驗證。
* 商品瀏覽與購物車。
* 建立訂單。
* 串接 Line Pay 付款流程。
* 會員點數累積，每消費 100 元累積 1 點。
* 會員點數兌換，累積 3 點可換購指定商品。
* 店員即時查看與處理訂單。
* 訂單狀態透過 WebSocket 即時更新。
* Admin 管理商品與使用者。
* 基本雲端部署與 CI/CD。

## 16.2 Line Pay 範圍

Line Pay 在本專案中作為主要線上付款方式，需支援：

* 建立付款請求。
* 使用者跳轉至 Line Pay 付款頁。
* 付款完成後接收 confirm / callback。
* 後端驗證付款結果。
* 付款成功後更新訂單付款狀態。
* 付款失敗或取消時保留訂單並標示付款失敗或未付款。

### 付款狀態

付款狀態定義請參考「# 8. 付款狀態與訂單狀態關係」。

## 16.3 非目標

以下功能不列入本版開發範圍：

* 不做外送流程。
* 不做多店分店管理。
* 不做會員等級。
* 不做點數折抵現金。
* 不做點數到期機制。
* 不做 Email 通知。
* 不做 Push Notification。
* 通知先以 WebSocket 為主。

## 16.4 設計假設

* 訂單以單一咖啡廳門市為場景。
* 使用者下單後需完成 Line Pay 付款，店員才開始正式處理訂單。
* 訪客可不註冊會員直接建立訂單、付款與追蹤自己的訂單。
* 會員點數只在付款成功後累積，不提供人工調整與折抵付款。
* 會員累積 3 點可兌換指定商品，兌換訂單不需 Line Pay 付款。
* 若 WebSocket 暫時中斷，前端仍可透過 REST API 重新查詢最新訂單狀態。
* 退款功能先保留資料模型與狀態，不作為 MVP 必要功能。

---

# 17. 使用案例與 User Flow

## 17.1 Guest Flow

### 訪客下單與付款

```txt
1. 訪客進入商品列表頁
2. 瀏覽咖啡與甜點商品
3. 將商品加入購物車
4. 進入購物車頁確認品項與數量
5. 點擊結帳
6. 填寫取餐聯絡資訊
7. 建立訪客訂單，訂單狀態為 pending，付款狀態為 unpaid
8. 後端建立 Line Pay 付款請求
9. 訪客跳轉至 Line Pay 完成付款
10. Line Pay 導回系統 confirm URL
11. 系統顯示訂單追蹤頁
```

### 訪客限制

* 訪客購物車只保存在前端本地狀態。
* 訪客可建立訂單、付款與追蹤自己的訂單。
* 訪客不可查看其他訪客或會員的訂單。
* 訪客不累積會員點數。
* 訪客訂單需保存聯絡資訊與訂單查詢碼，用於付款回導與訂單查詢。
* 訪客可使用 WebSocket 追蹤自己的訂單，但只能加入自己訂單的 room。
* 訪客可在訂單追蹤頁接收即時通知，重新開啟頁面時可用查詢碼與 phone / guest token 取得通知歷史。

---

## 17.2 User Flow

### 會員註冊與登入

```txt
1. User 進入註冊頁
2. 輸入姓名、Email、密碼
3. 系統建立帳號並回傳 JWT
4. User 進入商品列表頁
```

### 會員下單與付款

```txt
1. User 登入
2. 瀏覽商品列表
3. 加入商品到購物車
4. 進入購物車頁確認訂單
5. 建立訂單，訂單狀態為 pending，付款狀態為 unpaid
6. 後端建立 Line Pay 付款請求
7. User 跳轉至 Line Pay 完成付款
8. Line Pay 導回系統 confirm URL
9. 後端驗證付款結果
10. 付款成功後，付款狀態更新為 paid
11. 系統依 paidAmount 每 100 元累積 1 點
12. User 加入訂單 room 並追蹤訂單狀態
```

### 會員訂單追蹤

```txt
1. User 進入訂單列表頁
2. 點擊任一訂單進入訂單追蹤頁
3. Client 加入 room:order:{orderId}
4. Staff 更新訂單狀態
5. Server emit order_updated
6. User UI 即時更新訂單狀態
```

### 會員點數兌換

```txt
1. User 登入
2. User 查看目前會員點數
3. User 進入可兌換商品列表
4. User 選擇指定兌換商品
5. 系統檢查 User.points >= 3
6. 系統建立兌換訂單
7. 系統扣除 3 點
8. Staff 接收兌換訂單並依一般訂單流程製作
9. User 透過訂單追蹤頁接收狀態更新
```

---

## 17.3 Staff Flow

### 店員處理訂單

```txt
1. Staff 登入
2. 進入訂單管理頁
3. Client 加入 room:staff
4. 查看付款成功且狀態為 pending 的訂單
5. Staff 接單，狀態更新為 accepted
6. Staff 開始製作，狀態更新為 preparing
7. 製作完成，狀態更新為 ready
8. Server 通知 User 訂單已完成製作
9. User 取餐後，Staff 將狀態更新為 completed
```

### 店員限制

* Staff 不可建立、更新或刪除商品。
* Staff 不可管理使用者。
* Staff 只能依照允許的狀態轉換更新訂單。
* Staff 不處理付款結果，付款狀態由 Line Pay confirm 流程決定。

---

## 17.4 Admin Flow

### 商品管理

```txt
1. Admin 登入
2. 進入商品管理頁
3. 建立咖啡或甜點商品
4. 更新商品名稱、價格、分類、描述
5. 上架或下架商品
6. 商品列表頁即時反映可售狀態
```

### 使用者管理

```txt
1. Admin 進入使用者管理頁
2. 查看使用者列表
3. 調整使用者角色
4. 停用異常帳號
```

### Admin 限制

* Admin 不直接修改 Line Pay 付款結果。
* Admin 不直接修改會員點數，點數由付款成功訂單自動累積。

---

## 17.5 付款與點數流程

### 會員付款與點數流程

```txt
1. User 建立訂單
2. 系統建立 Line Pay payment request
3. User 完成付款
4. Line Pay 回導 confirm URL
5. Backend confirm 付款結果
6. paymentStatus 更新為 paid
7. 計算 pointsEarned = Math.floor(paidAmount / 100)
8. User.points 增加 pointsEarned
9. Order.pointsEarned 寫入本次入帳點數
10. 通知 Staff 有新付款完成訂單
```

### 訪客付款流程

```txt
1. Guest 建立訪客訂單
2. 系統建立 Line Pay payment request
3. Guest 完成付款
4. Line Pay 回導 confirm URL
5. Backend confirm 付款結果
6. paymentStatus 更新為 paid
7. 不累積會員點數
8. 通知 Staff 有新付款完成訂單
9. Guest 透過 guest token / orderLookupCode 追蹤訂單狀態
```

### 點數範例

| 付款金額 | 累積點數 |
| ------ | ------ |
| 99     | 0      |
| 100    | 1      |
| 250    | 2      |
| 999    | 9      |

### 點數兌換範例

| 目前點數 | 動作 | 結果 |
| ------ | ---- | ---- |
| 2      | 兌換商品 | 拒絕兌換 |
| 3      | 兌換商品 | 扣除 3 點，剩餘 0 點 |
| 10     | 兌換商品 | 扣除 3 點，剩餘 7 點 |

---

# 18. 備註

本系統設計以「可展示工程能力」為目標，
重點在於：

* 系統設計能力
* 即時通訊實作
* 架構清晰度
* 可部署與可維運性

---

# 19. Specification-Driven Development 規格

本章節用於將需求轉換為可開發、可測試、可驗收的規格。每個功能都需對應明確的業務規則、API、驗收條件與測試案例。

---

## 19.1 Functional Specifications

| Spec ID | 功能 | 角色 | Priority | 說明 |
| ------- | ---- | ---- | -------- | ---- |
| FS-001 | 瀏覽商品列表 | Guest / User / Staff / Admin | Must | 使用者可查看可販售商品 |
| FS-002 | 使用購物車 | Guest / User | Must | 可加入商品、調整數量、移除商品 |
| FS-003 | 會員註冊 | Guest | Must | 建立會員帳號並取得 JWT |
| FS-004 | 會員登入 | User / Staff / Admin | Must | 使用 Email 與密碼登入 |
| FS-005 | 建立會員訂單 | User | Must | 會員可建立自己的訂單 |
| FS-006 | 建立訪客訂單 | Guest | Must | 訪客可不註冊直接建立訂單 |
| FS-007 | 建立 Line Pay 付款請求 | Guest / User | Must | 系統建立付款請求並回傳付款 URL |
| FS-008 | 確認 Line Pay 付款 | Guest / User | Must | 後端確認付款結果並更新訂單付款狀態 |
| FS-009 | 店員處理訂單 | Staff / Admin | Must | 店員依允許狀態轉換更新訂單 |
| FS-010 | 訂單即時通知 | Guest / User / Staff | Must | 訂單與付款狀態透過 WebSocket 即時更新 |
| FS-011 | 會員點數入帳 | User | Should | 付款成功後依金額累積會員點數 |
| FS-012 | 商品管理 | Admin | Must | Admin 可新增、修改、刪除、上下架商品 |
| FS-013 | 使用者管理 | Admin | Should | Admin 可查看使用者並調整角色 |
| FS-014 | 通知歷史查詢 | Guest / User | Must | User / Guest 可查詢自己的訂單通知歷史 |
| FS-015 | 會員點數兌換商品 | User | Should | User 累積 3 點可兌換指定商品 |
| FS-016 | CORS 與跨網域設定 | System | Must | Backend REST API 與 Socket.io 必須允許合法前端來源 |

---

## 19.2 Business Rules

| Rule ID | 規則 |
| ------- | ---- |
| BR-001 | 商品價格、訂單總金額必須由後端計算，前端不可直接決定付款金額。 |
| BR-002 | 訂單建立後預設 `status = pending`，`paymentStatus = unpaid`。 |
| BR-003 | 只有 `paymentStatus = paid` 的訂單可由 Staff 接單。 |
| BR-004 | 訂單狀態只能依 `allowedTransitions` 轉換。 |
| BR-005 | `completed` 與 `cancelled` 為終態，不可再轉換成其他狀態。 |
| BR-006 | Line Pay confirm 必須具備冪等性，重複呼叫不可重複付款入帳或重複加點。 |
| BR-007 | 會員點數只在付款狀態第一次轉為 `paid` 時入帳。 |
| BR-008 | 會員每消費 100 元累積 1 點，未滿 100 元不累積。 |
| BR-009 | Guest 可建立與追蹤自己的訂單，但不累積會員點數。 |
| BR-010 | Guest 查詢訂單需提供 `orderLookupCode` 並搭配 phone 或 guest token 驗證。 |
| BR-011 | WebSocket room 加入前必須驗證身分或訂單歸屬。 |
| BR-012 | Line Pay channel secret 只能存在後端環境變數，不可暴露於前端。 |
| BR-013 | Guest 通知只能透過 `orderLookupCode` 搭配 phone 或 guest token 查詢。 |
| BR-014 | Staff 更新訂單狀態時，系統需寫入 Notification 並 emit 給對應 order room。 |
| BR-015 | User 累積 3 點可兌換指定商品，每次兌換固定扣除 3 點。 |
| BR-016 | 兌換訂單不進入 Line Pay 付款流程，且不累積會員點數。 |
| BR-017 | Staff / Admin 點餐紀錄可查完整訂單；User 點餐紀錄只能查自己的會員訂單。 |
| BR-018 | Production Line Pay confirm/cancel redirect URL 不可指向 localhost。 |
| BR-017 | User 點數不足 3 點時不可建立兌換訂單。 |

---

## 19.3 Acceptance Criteria

### AC-001 瀏覽商品列表

```gherkin
Given 系統存在可販售商品
When Guest 或 User 進入商品列表頁
Then 系統應顯示 isAvailable = true 的商品
And 商品需包含名稱、價格、分類與描述
```

### AC-002 建立訪客訂單

```gherkin
Given Guest 已將商品加入購物車
When Guest 填寫姓名、手機並送出訂單
Then 系統應建立一筆訪客訂單
And 回傳 orderLookupCode
And 訂單 status 應為 pending
And paymentStatus 應為 unpaid
```

### AC-003 建立會員訂單

```gherkin
Given User 已登入並將商品加入購物車
When User 送出訂單
Then 系統應建立一筆會員訂單
And 訂單 userId 應為目前登入使用者
And 訂單總金額應由後端商品價格計算
```

### AC-004 Line Pay 付款請求

```gherkin
Given 訂單存在且 paymentStatus = unpaid
When User 或 Guest 發起 Line Pay 付款
Then 後端應呼叫 Line Pay request API
And 建立 Payment 紀錄
And 將 paymentStatus 更新為 payment_pending
And 回傳 Line Pay paymentUrl
```

### AC-005 Line Pay 付款確認

```gherkin
Given Line Pay 已完成付款並回傳 transactionId
When 後端執行 confirm
Then 系統應驗證 transactionId 與訂單對應
And 確認付款金額等於訂單金額
And 將 paymentStatus 更新為 paid
And 通知 Staff 有新付款完成訂單
```

### AC-006 會員點數入帳

```gherkin
Given 會員訂單付款成功
When paymentStatus 第一次變成 paid
Then 系統應計算 Math.floor(paidAmount / 100)
And 將點數加到 User.points
And 將本次點數寫入 Order.pointsEarned
```

### AC-007 店員接單

```gherkin
Given 訂單 paymentStatus = paid 且 status = pending
When Staff 將訂單狀態更新為 accepted
Then 系統應允許更新
And Server 應 emit order_updated 給訂單 room
```

### AC-008 未付款訂單不可接單

```gherkin
Given 訂單 paymentStatus 不是 paid
When Staff 嘗試將 status 更新為 accepted
Then 系統應拒絕更新
And 回傳 400 或 403 錯誤
```

### AC-009 訪客不可查詢他人訂單

```gherkin
Given Guest 擁有自己的 orderLookupCode
When Guest 使用錯誤 phone 或無效 guest token 查詢訂單
Then 系統應拒絕查詢
And 不回傳訂單內容
```

### AC-010 即時狀態更新

```gherkin
Given User 或 Guest 正在訂單追蹤頁
When Staff 更新訂單狀態
Then Client 應在 1 秒內收到 order_updated
And UI 應顯示最新訂單狀態
```

### AC-011 訪客通知歷史查詢

```gherkin
Given Guest 曾建立訂單並擁有 orderLookupCode
When Guest 使用正確 phone 或 guest token 查詢通知歷史
Then 系統應回傳該訂單的 notifications
And 不應回傳其他訂單通知
```

### AC-012 訂單狀態更新建立通知

```gherkin
Given Staff 更新訂單狀態
When 狀態更新成功
Then 系統應建立一筆 Notification
And Server 應 emit notification 給 room:order:{orderId}
```

### AC-013 會員點數兌換成功

```gherkin
Given User 已登入且 User.points >= 3
And 商品 isRedeemable = true
When User 送出兌換商品請求
Then 系統應建立一筆 orderType = redeem 的訂單
And 系統應扣除 User.points 3 點
And 訂單 pointsRedeemed 應為 3
And 訂單 paymentStatus 應為 paid
```

### AC-014 會員點數不足不可兌換

```gherkin
Given User 已登入且 User.points < 3
When User 送出兌換商品請求
Then 系統應拒絕建立兌換訂單
And 不可扣除會員點數
```

---

## 19.4 Non-Functional Requirements

| NFR ID | 類型 | 規格 |
| ------ | ---- | ---- |
| NFR-001 | Security | 所有需要登入的 API 必須驗證 JWT。 |
| NFR-002 | Security | Guest 訂單查詢碼不可使用連續流水號，需具備不可猜測性。 |
| NFR-003 | Security | Line Pay secret、JWT secret 不可提交至 Git。 |
| NFR-004 | Reliability | Line Pay confirm 需可重複呼叫且結果一致。 |
| NFR-005 | Performance | 訂單狀態更新 WebSocket 通知目標為 1 秒內送達。 |
| NFR-006 | Maintainability | Controller 不放商業邏輯，商業規則集中於 service。 |
| NFR-007 | Observability | 付款 request、confirm、failed 需保留 log 或 Payment raw response 摘要。 |
| NFR-008 | Compatibility | Frontend 需支援桌面與手機瀏覽器基本操作。 |
| NFR-009 | Security | CORS 不可使用 `origin: *`，必須限制為 `CLIENT_ORIGIN`。 |
| NFR-010 | Compatibility | REST API、Socket.io、Line Pay redirect 流程需支援前後端分離部署。 |
| NFR-011 | Deployability | Backend 必須可透過 Docker image 部署，runtime secrets 必須由環境變數注入。 |
| NFR-012 | Portability | Local integration environment 應可透過 Docker Compose 啟動 Frontend + Backend + MongoDB。 |
| NFR-013 | Deployability | Frontend container 必須使用靜態檔 server，並支援 SPA fallback 避免 route refresh 404。 |

---

## 19.5 Test Specifications

| Test ID | 對應 Spec | 測試內容 | 類型 |
| ------- | --------- | -------- | ---- |
| TC-001 | FS-001 | 只顯示可販售商品 | Integration |
| TC-002 | FS-006 | 訪客建立訂單並取得 orderLookupCode | Integration |
| TC-003 | FS-005 | 會員建立訂單且 userId 正確 | Integration |
| TC-004 | FS-007 | 建立 Line Pay 付款請求並更新 payment_pending | Integration |
| TC-005 | FS-008 | Line Pay confirm 成功後更新 paid | Integration |
| TC-006 | FS-008 / FS-011 | 重複 confirm 不重複加點 | Unit / Integration |
| TC-007 | FS-009 | paid pending 訂單可被 Staff 接單 | Integration |
| TC-008 | FS-009 | unpaid 訂單不可被 Staff 接單 | Integration |
| TC-009 | FS-010 | 訂單狀態更新後 emit order_updated | WebSocket |
| TC-010 | FS-006 | 訪客不可用錯誤 phone 查詢訂單 | Integration |
| TC-011 | FS-012 | 非 Admin 不可建立商品 | Integration |
| TC-012 | FS-011 | 付款 250 元累積 2 點 | Unit |
| TC-013 | FS-009 | 訂單狀態只能依 allowedTransitions 轉換 | Unit |
| TC-014 | FS-008 | confirm 金額不一致時拒絕更新 paid | Unit |
| TC-015 | FS-011 | Guest 付款成功不累積會員點數 | Unit |
| TC-016 | FS-002 | 購物車可新增商品、調整數量與移除商品 | Unit |
| TC-017 | FS-003 | 會員註冊成功後回傳 User 與 JWT | Integration |
| TC-018 | FS-004 | 登入成功後取得 JWT | Integration |
| TC-019 | FS-004 | 密碼錯誤時登入失敗並回傳 401 | Integration |
| TC-020 | FS-010 | Guest 使用無效 guest token 不可加入訂單 room | WebSocket |
| TC-021 | FS-014 | Guest 使用正確查詢資訊可取得通知歷史 | Integration |
| TC-022 | FS-014 | Guest 使用錯誤 phone 不可取得通知歷史 | Integration |
| TC-023 | FS-010 / FS-014 | Staff 更新狀態後建立 Notification 並 emit notification | Integration / WebSocket |
| TC-024 | FS-015 | User 3 點可成功兌換商品並扣除 3 點 | Integration |
| TC-025 | FS-015 | User 點數不足 3 點不可兌換商品 | Unit / Integration |
| TC-026 | FS-015 | 兌換訂單不累積會員點數 | Unit |
| TC-027 | FS-016 | 合法 CLIENT_ORIGIN 可呼叫 REST API | Integration |
| TC-028 | FS-016 | 非允許 origin 不可呼叫 REST API | Integration |
| TC-029 | FS-016 | Socket.io 僅允許 CLIENT_ORIGIN 連線 | WebSocket |
| TC-030 | FS-016 | Preflight OPTIONS request 正常回應 | Integration |

---

## 19.6 Traceability Matrix

| Spec ID | API / Module | Business Rules | Acceptance Criteria | Test Cases | Status |
| ------- | ------------ | -------------- | ------------------- | ---------- | ------ |
| FS-001 | `GET /api/products` | BR-001 | AC-001 | TC-001 | Accepted |
| FS-002 | `cartStore` | BR-001 | - | TC-016 | Accepted |
| FS-003 | `POST /api/auth/register` | NFR-001 | - | TC-017 | Accepted |
| FS-004 | `POST /api/auth/login` | NFR-001 | - | TC-018, TC-019 | Accepted |
| FS-005 | `POST /api/orders` | BR-001, BR-002 | AC-003 | TC-003 | Accepted |
| FS-006 | `POST /api/orders/guest`, `GET /api/orders/guest/:lookupCode` | BR-001, BR-002, BR-009, BR-010 | AC-002, AC-009 | TC-002, TC-010 | Accepted |
| FS-007 | `POST /api/payments/line-pay/request` | BR-001, BR-012 | AC-004 | TC-004 | Accepted |
| FS-008 | `POST /api/payments/line-pay/confirm` | BR-006, BR-012 | AC-005 | TC-005, TC-006, TC-014 | Accepted |

| FS-009 | `PATCH /api/orders/:id/status` | BR-003, BR-004, BR-005 | AC-007, AC-008 | TC-007, TC-008, TC-013 | Accepted |
| FS-010 | Socket.io `order_updated`, `notification` | BR-011, BR-014 | AC-010, AC-012 | TC-009, TC-020, TC-023 | Accepted |
| FS-011 | `PointService` | BR-007, BR-008, BR-009 | AC-006 | TC-006, TC-012, TC-015 | Accepted |
| FS-012 | Product Module | NFR-001 | - | TC-011 | Accepted |
| FS-013 | `GET /api/users`, `PATCH /api/users/:id/role` | NFR-001 | - | User API integration tests | Accepted |
| FS-014 | Notification Module | BR-013, BR-014 | AC-011, AC-012 | TC-021, TC-022, TC-023 | Accepted |
| FS-015 | `POST /api/orders/redeem`, `PointService` | BR-015, BR-016, BR-017 | AC-013, AC-014 | TC-024, TC-025, TC-026 | Accepted |
| FS-016 | CORS / Socket.io config | NFR-009, NFR-010 | - | TC-027, TC-028, TC-029, TC-030 | Accepted |

---

## 19.7 Development Workflow

開發時需依照以下流程進行：

```txt
1. 選定 Spec ID
2. 確認 Business Rules
3. 實作 API / Service / UI
4. 撰寫對應 Test Case
5. 依 Acceptance Criteria 驗收
6. 更新 Traceability Matrix 狀態
```

### Issue 命名建議

```txt
[FS-006] Implement guest order creation
[FS-008] Implement Line Pay confirm flow
[FS-011] Add member point earning logic
[FS-015] Add member point redemption logic
```

---

# 20. Implementation Decisions

本章節用於消除開發歧義。若前文出現「建議」、「可選」、「依實作策略」等描述，實作時以本章節決策為準。

---

## 20.1 固定開發決策

| 項目 | 決策 |
| ---- | ---- |
| Guest checkout | Guest 不需註冊即可建立訂單、付款、追蹤訂單與接收通知。 |
| Guest identity | Guest 訂單必須同時產生 `orderLookupCode` 與 guest token。 |
| Guest token | 只儲存 `guestTokenHash`，不可儲存明文 token。 |
| Guest token expiry | guest token 有效期限固定為 7 天。 |
| Line Pay cancel | 使用者取消 Line Pay 付款後，`paymentStatus` 必須更新為 `payment_failed`。 |
| Line Pay confirm duplicate | 重複 confirm 已付款訂單時，必須回傳既有 paid 結果，不可重複加點。 |
| Line Pay amount mismatch | confirm 金額與訂單金額不一致時，必須拒絕更新 `paid`。 |
| Redeem order | 點數兌換訂單不走 Line Pay，建立成功後 `paymentStatus = paid`。 |
| Redeem points | 每次兌換固定扣除 3 點。 |
| Redeem quantity | 一筆兌換訂單只能兌換 1 個商品。 |
| Notification persistence | 訂單狀態更新必須寫入 Notification。 |
| API error format | 所有 API 錯誤必須使用統一錯誤格式。 |
| CORS origin | Backend REST API 與 Socket.io 只能允許 `CLIENT_ORIGIN`，不可使用 `*`。 |
| Line Pay redirect | Line Pay redirect URL 必須回到 Frontend domain。 |
| Frontend unit test | 前端單元測試必須使用 Vitest。 |
| Frontend component test | Vue component 測試必須使用 Vue Test Utils。 |
| Frontend E2E test | 前端 E2E 測試必須使用 Playwright。 |
| Backend unit test | 後端單元測試必須使用 Jest。 |
| Backend API integration test | 後端 API 整合測試必須使用 Jest + Supertest。 |
| Backend WebSocket test | 後端 WebSocket 測試必須使用 Jest + socket.io-client。 |
| Node.js version | 前後端開發與 CI 必須使用 Node.js 20 LTS。 |
| Package manager | 前後端套件管理器固定使用 npm。 |
| TypeScript | 前後端 TypeScript 必須啟用 strict mode。 |
| Lint and format | 前後端必須使用 ESLint 與 Prettier。 |

---

## 20.2 Validation Rules

| 欄位 | 規則 |
| ---- | ---- |
| `name` | required，長度 1 到 50 字元 |
| `email` | required，需符合 email 格式，需 lowercase 儲存 |
| `password` | required，至少 8 字元 |
| `phone` | required for Guest，需符合台灣手機格式 `09xxxxxxxx` |
| `product.name` | required，長度 1 到 80 字元 |
| `product.price` | required，整數，需大於等於 0 |
| `product.category` | enum：`coffee`、`dessert` |
| `quantity` | required，整數，範圍 1 到 99 |
| `orderLookupCode` | 8 碼大寫英數，不可使用連續流水號 |
| `guestToken` | 至少 32 bytes entropy，回傳前端一次，後端只存 hash |
| `redeemPoints` | 可兌換商品固定為 3 |
| `page` | 預設 1，最小 1 |
| `limit` | 預設 20，最大 100 |

---

## 20.3 Error Codes

統一錯誤格式：

```json
{
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

| Code | HTTP Status | 說明 |
| ---- | ----------- | ---- |
| `AUTH_INVALID_CREDENTIALS` | 401 | 登入帳號或密碼錯誤 |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT 過期 |
| `AUTH_TOKEN_INVALID` | 401 | JWT 無效 |
| `FORBIDDEN_ROLE` | 403 | 角色權限不足 |
| `RESOURCE_NOT_FOUND` | 404 | 資源不存在 |
| `VALIDATION_ERROR` | 400 | 請求資料不符合驗證規則 |
| `EMAIL_ALREADY_EXISTS` | 409 | Email 已被註冊 |
| `ORDER_NOT_FOUND` | 404 | 訂單不存在 |
| `ORDER_ACCESS_DENIED` | 403 | 不可存取非自己的訂單 |
| `INVALID_STATUS_TRANSITION` | 400 | 訂單狀態轉換不合法 |
| `PAYMENT_ALREADY_PAID` | 200 | 重複 confirm 已付款訂單，回傳既有付款結果 |
| `PAYMENT_AMOUNT_MISMATCH` | 409 | Line Pay confirm 金額與訂單金額不一致 |
| `PAYMENT_NOT_PAID` | 400 | 訂單尚未付款，不可接單 |
| `GUEST_TOKEN_INVALID` | 401 | Guest token 無效或過期 |
| `GUEST_LOOKUP_INVALID` | 401 | 訪客查詢碼或 phone 不正確 |
| `POINTS_NOT_ENOUGH` | 400 | 會員點數不足 |
| `PRODUCT_NOT_REDEEMABLE` | 400 | 商品不可用點數兌換 |

---

## 20.4 狀態機決策

### OrderType

```ts
type OrderType = 'purchase' | 'redeem'
```

| orderType | paymentStatus | 說明 |
| --------- | ------------- | ---- |
| `purchase` | `unpaid` / `payment_pending` / `paid` / `payment_failed` / `refunded` | 一般購買訂單，需經 Line Pay 付款 |
| `redeem` | `paid` | 點數兌換訂單，不經 Line Pay |

### OrderStatus 轉換

```ts
const allowedTransitions = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
}
```

### 狀態限制

* `paymentStatus != paid` 時，不可將 `status` 從 `pending` 更新為 `accepted`。
* `orderType = redeem` 建立成功後，`paymentStatus` 必須為 `paid`。
* `completed` 與 `cancelled` 為終態。
* `cancelled` 的兌換訂單需退回 `pointsRedeemed`。
* `completed` 的兌換訂單不可取消，不退點。

---

## 20.5 Line Pay 決策

* 前端只可呼叫本系統 backend API，不可直接呼叫 Line Pay API。
* `POST /api/payments/line-pay/request` 只接受 `paymentStatus = unpaid` 或 `payment_failed` 的 purchase 訂單。
* 建立付款請求後，`paymentStatus` 必須更新為 `payment_pending`。
* Line Pay redirect 回前端 confirm page 後，由前端呼叫 backend confirm API。
* Backend confirm 成功後才可更新 `paymentStatus = paid`。
* confirm 成功時若訂單為會員 purchase 訂單，才可累積點數。
* confirm 金額不一致時，Payment raw response 需保存，Order 不可更新為 `paid`。
* cancel 後 `paymentStatus` 固定更新為 `payment_failed`。

---

## 20.6 點數決策

* 只有 User 可累積與兌換會員點數。
* Guest 不累積點數，也不可兌換點數商品。
* 每消費 100 元累積 1 點，公式為 `Math.floor(paidAmount / 100)`。
* 點數只在 `paymentStatus` 第一次變成 `paid` 時入帳。
* 重複 confirm 不可重複加點。
* User.points >= 3 才可兌換商品。
* 一次兌換固定扣除 3 點。
* 兌換商品必須 `isRedeemable = true`。
* 兌換訂單不累積點數。
* 兌換訂單取消時需退回 3 點。
* Admin 不可直接修改 User.points；點數只能透過付款入帳、兌換扣點、取消兌換退點異動。

---

## 20.7 Database Indexes

| Collection | Index |
| ---------- | ----- |
| `users` | `email` unique |
| `products` | `category`, `isAvailable`, `isRedeemable` |
| `orders` | `userId`, `status`, `paymentStatus`, `createdAt` |
| `orders` | `orderLookupCode` unique sparse |
| `orders` | `linePayOrderId` unique sparse |
| `payments` | `transactionId` unique sparse |
| `payments` | `merchantOrderId` unique |
| `payments` | `orderId` |
| `notifications` | `userId`, `isRead`, `createdAt` |
| `notifications` | `guestOrderLookupCode`, `orderId`, `createdAt` |

---

## 20.8 Pagination And Sorting

* 所有 list API 預設 `page = 1`。
* 所有 list API 預設 `limit = 20`。
* `limit` 最大值為 100。
* 商品列表預設排序為 `createdAt desc`。
* 訂單列表預設排序為 `createdAt desc`。
* 通知列表預設排序為 `createdAt desc`。
* Staff 訂單管理頁預設查詢 `paymentStatus = paid` 且 `status = pending`。

---

## 20.9 CORS Decisions

* 前後端分離部署必須設定 CORS。
* REST API CORS `origin` 必須等於 `CLIENT_ORIGIN`。
* Socket.io CORS `origin` 必須等於 `CLIENT_ORIGIN`。
* 不允許 `origin: '*'`。
* 必須允許 HTTP methods：`GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`OPTIONS`。
* 必須允許 headers：`Content-Type`、`Authorization`、`X-Guest-Token`。
* 使用 cookie 時，Backend 必須設定 `credentials: true`，Frontend Axios 必須設定 `withCredentials: true`。
* Preflight `OPTIONS` request 必須回應成功。
* Production `CLIENT_ORIGIN` 必須使用 HTTPS。

---

## 20.10 Definition Of Done

每個 FS 必須符合以下條件才可將 Status 更新為 `Accepted`：

* API / Service / UI 已依規格完成。
* 對應 Business Rules 已實作。
* 對應 Acceptance Criteria 已驗收。
* 對應 Test Cases 已建立並通過。
* Frontend UI 必須支援 mobile / tablet / desktop RWD，不得只完成桌機版。
* Frontend UI 變更必須通過 Playwright desktop 與 mobile smoke tests。
* 若變更 deployment/runtime 行為，必須同步更新容器化規格與部署文件。
* Traceability Matrix 已更新 Status。
* 無 lint error。
* 無 test failure。
* 不引入與本 FS 無關的重構。

---

## 20.11 Tooling Decisions

| 項目 | 決策 |
| ---- | ---- |
| Node.js | 使用 Node.js 20 LTS |
| Package manager | 使用 npm，不使用 pnpm 或 yarn |
| TypeScript | 前後端都必須啟用 `strict: true` |
| Frontend CSS | 使用 Tailwind CSS v4，透過 `@tailwindcss/vite` 與 `src/tailwind.css` 匯入全域樣式 |
| Frontend RWD | Mobile-first；所有頁面需支援 mobile / tablet / desktop，使用 Tailwind responsive utilities |
| Backend container | Backend production deployment 必須支援 Docker image |
| Frontend container | 使用 Vite build + Nginx static server，並以 SPA fallback 支援 Vue Router 重新整理 |
| Local container orchestration | 使用 Docker Compose 建立 local Frontend + Backend + MongoDB integration environment |
| Lint | 前後端都必須使用 ESLint |
| Format | 前後端都必須使用 Prettier |
| Frontend unit test | 使用 Vitest |
| Frontend component test | 使用 Vue Test Utils |
| Frontend E2E test | 使用 Playwright |
| Backend unit test | 使用 Jest |
| Backend API integration test | 使用 Jest + Supertest |
| Backend WebSocket test | 使用 Jest + socket.io-client |
| Backend integration test DB | 使用 `mongodb-memory-server` |
| External payment API test | 測試中必須 mock `linePay.client.ts`，不可在 CI 呼叫真實 Line Pay API |
| CI command | CI 執行 install、lint、test、build（`.github/workflows/ci.yml`，兩個並行 job：backend / frontend）|
| Swagger | `swagger-jsdoc` + `swagger-ui-express`，掛載於 `/api-docs` |
| Demo seed | `backend/src/scripts/seed.ts`，`npm run seed` 寫入展示帳號與商品資料 |

### 測試 DB 規則

* Unit test 不連接真實 MongoDB。
* Backend integration test 必須使用 `mongodb-memory-server`。
* 每個 integration test suite 結束後必須清空測試資料。
* CI 不可依賴開發者本機 MongoDB。

### Line Pay 測試規則

* Unit test 必須 mock `linePay.client.ts`。
* Integration test 必須使用 mock Line Pay response。
* CI 不可呼叫 Line Pay sandbox 或 production API。
* Line Pay sandbox 僅供人工驗證或 staging 環境使用。

---

## 20.12 Traceability Status 流程

| Status | 條件 |
| ------ | ---- |
| `Planned` | 已定義規格，尚未開始實作 |
| `In Progress` | 已開始實作 API / Service / UI |
| `Implemented` | 功能已完成，但測試尚未完整通過 |
| `Tested` | 對應 TC 已通過 |
| `Accepted` | AC 已驗收且符合 Definition Of Done |

Status 只能依序前進，不可跳過階段。

---

# ✅ 結語

本專案完成後，應具備：

* 中型系統設計能力
* 前後端整合能力
* 即時系統實作能力
* 雲端部署與工程化能力

---

# 附錄 A. 安全修復記錄（2026-05-18）

## A.1 Critical 修復

| 項目 | 模組 | 說明 |
|------|------|------|
| Fix-1 | `order.service.ts` `getGuestOrder` | 增加 `guestTokenExpiresAt` 到期驗證；過期 token 視為無效 |
| Fix-2 | `payment.service.ts` `createMockPaymentUrl` | 移除 redirect URL 中的明文 guestToken 參數；前端改從 store 讀取 |
| Fix-3 | `env.ts` | 正式環境啟動時若 `JWT_SECRET` 仍為預設值則拋出錯誤，強制替換密鑰 |
| Fix-4 | `payment.service.ts` | 移除重複的 `hashGuestToken` 函式；統一從 `utils/crypto` 匯入 |

## A.2 Medium 修復

| 項目 | 模組 | 說明 |
|------|------|------|
| Fix-5 | `order.service.ts` `createRedeemOrder` | 若 `OrderModel.create` 失敗，自動回滾已扣除的點數（`pointService.returnPoints`） |
| Fix-6 | `order.service.ts` `returnRedeemedPointsIfCancelled` | 移除 in-memory `order.pointsRedeemed = 0` 直接變動；DB 為唯一真實來源 |
| Fix-7 | `LinePayConfirmView.vue` | 結構化錯誤碼顯示（`PAYMENT_AMOUNT_MISMATCH`、`ORDER_ACCESS_DENIED` 等），附本地化說明與查看訂單連結 |
| Fix-8 | `api/http.ts` | 新增 Axios response interceptor，收到 401 時自動呼叫 `authStore.logout()`，清除過期 token |

## A.3 Minor 修復

| 項目 | 模組 | 說明 |
|------|------|------|
| Fix-9 | `PointsView.vue` `onMounted` | 每次進入頁面都重新載入 `orderStore.loadMyOrders()`，移除「只有空時才載入」的條件 |
| Fix-10 | `order.store.ts` `loadTodaySummary` | 移除 fallback 重新抓取 200 筆訂單的死碼；後端 `soldItems` 永遠回傳 |

---
