# Coffee Ordering AI Agents 開發參考

本文件用於搭配 `Coffee Real-time Ordering System 規格書.md`，作為 AI agents 分工開發的參考。

Encoding: Markdown files are saved as UTF-8 with BOM and pinned in `.editorconfig` to avoid Traditional Chinese mojibake in Windows tools.

---

# 1. 開發原則

本專案可以由 AI agents 主導開發，但不建議一次交給單一 agent 全部完成。

建議採用：

* 分階段開發
* 依 Spec ID 分工
* 每個 agent 只處理明確範圍
* 每次完成後更新 Traceability Matrix Status
* 每個階段都需通過 lint、test、build

---

## Documentation handoff rule

Every agent must update documentation in the same change set as code changes. Before handoff, check all affected docs:

* `README.md`
* `DEVELOPMENT_PROGRESS.md`
* `Coffee Real-time Ordering System 規格書.md`
* Backend Swagger/JSDoc route comments
* This AI agent reference
* `AGENTS.md`
* Local agent guidance such as `CLAUDE.md` when present

Update these files whenever behavior, API contracts, UI flows, environment variables, deployment steps, tests, or operational assumptions change. If a change does not require documentation edits, state that explicitly in the handoff notes.

---

# 2. Agent 分工建議

## Agent 1：Project Scaffold / Tooling

### 範圍

* 第 10 章前後端專案結構
* 第 20.11 Tooling Decisions
* FS-016 CORS 基礎設定

### 任務

* 建立 frontend / backend 專案骨架
* 設定 Node.js 20 LTS
* 使用 npm
* 設定 TypeScript strict mode
* 設定 ESLint / Prettier
* 設定測試工具
* 設定 CORS 基礎設定

### 完成狀態：✅ 已完成

實際成果：

* `backend/` — Express + TypeScript，ESLint、Jest + ts-jest、mongodb-memory-server
* `frontend/` — Vue 3 + Vite + TypeScript，ESLint、Vitest + @vue/test-utils + jsdom
* `backend/.env.example` 含所有必要環境變數
* CORS 使用 `corsOptions`，origin 從 `env.clientOrigin` 讀取，禁止 `origin: *`

---

## Agent 2：Backend Auth / RBAC

### 範圍

* FS-003
* FS-004
* RBAC middleware
* TC-017
* TC-018
* TC-019

### 任務

* User model
* Register API
* Login API
* JWT 驗證
* RBAC middleware
* Auth 測試

### 完成狀態：✅ 已完成

實際成果：

* `UserModel`：name / email / password / role / points
* `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`
* JWT middleware：`authenticate` 寫入 `req.user = { id, role }`
* RBAC middleware：`authorize(roles[])` 回傳 403
* `asyncHandler` 包裝所有 async route handler
* `ApiError` 統一錯誤格式
* 測試：3 個（TC-017、TC-018、TC-019）

---

## Agent 3：Backend Product / Admin Product

### 範圍

* FS-001
* FS-012
* TC-001
* TC-011

### 任務

* Product model
* 商品列表 API
* Admin 商品 CRUD
* 可兌換商品欄位
* Product 測試

### 完成狀態：✅ 已完成

實際成果：

* `ProductModel`：name / price / category / description / imageUrl / isAvailable / isRedeemable / redeemPoints
* `GET /api/products`（public，預設只回傳 isAvailable=true）
* `POST /api/products`、`PUT /api/products/:id`、`DELETE /api/products/:id`（admin only）
* `isRedeemable` 商品固定 `redeemPoints = 3`，非 3 的值被 Zod 拒絕
* Zod validators：`createProductSchema`、`updateProductSchema`
* 測試：6 個（TC-001、TC-011 + 品類過濾、CRUD、401）

---

## Agent 4：Backend Order / Guest Order

### 範圍

* FS-005
* FS-006
* FS-009
* TC-002
* TC-003
* TC-007
* TC-008
* TC-013

### 任務

* 會員訂單建立
* 訪客訂單建立
* orderLookupCode
* guestTokenHash
* 訂單狀態轉換
* Staff 訂單處理 API
* Order 測試

### 完成狀態：✅ 已完成

實際成果：

* `OrderModel`：userId / guestInfo / orderLookupCode / guestTokenHash / guestTokenExpiresAt / items / totalAmount / status / paymentStatus / orderType / pointsRedeemed
* `POST /api/orders`（user/admin）、`POST /api/orders/guest`（public）
* `GET /api/orders/my`、`GET /api/orders`（staff/admin）、`GET /api/orders/guest/:lookupCode`
* `PATCH /api/orders/:id/status`（含 PAYMENT_NOT_PAID 與 INVALID_STATUS_TRANSITION 防護）
* `GET /api/orders/:id`（staff/admin 或訂單擁有者）
* totalAmount 全部由後端計算，禁止前端傳入
* 訪客 guestToken 一次性回傳，server 只存 hash
* 測試：8 個（TC-002、TC-003、TC-007、TC-008、TC-010、TC-013）

---

## Agent 5：Backend Payment / Line Pay

### 範圍

* FS-007
* FS-008
* TC-004
* TC-005
* TC-006
* TC-014

### 任務

* Payment model
* linePay.client.ts
* Line Pay request API
* Line Pay confirm API
* Confirm 冪等性
* 金額不一致處理
* mock Line Pay 測試

### 完成狀態：✅ 已完成

實際成果：

* `PaymentModel`：provider / transactionId / merchantOrderId / amount / currency / status / rawRequest / rawResponse / confirmedAt
* `linePay.client.ts`：HMAC-SHA256 簽名，可 mock，測試不呼叫真實 API
* `POST /api/payments/line-pay/request`（user 或 guest + X-Guest-Token）
* `POST /api/payments/line-pay/confirm`（冪等，重複 confirm 不重複加點）
* amount mismatch → Payment `payment_failed`，Order 保持 unpaid，不更新為 paid
* 測試：5 個（TC-004、TC-005、TC-006、TC-014 + 金額不一致）

---

## Agent 6：Backend Notification / WebSocket

### 範圍

* FS-010
* FS-014
* TC-009
* TC-020
* TC-021
* TC-022
* TC-023

### 任務

* Notification model
* User / Guest 通知歷史 API
* Socket.io server
* room 權限驗證
* order_updated event
* notification event
* WebSocket 測試

### 完成狀態：✅ 已完成

實際成果：

* `NotificationModel`：userId / guestOrderLookupCode / orderId / audience / type / message / isRead
* `GET /api/notifications`、`GET /api/notifications/guest/:lookupCode`、`PATCH /api/notifications/:id/read`
* Socket.io rooms：`room:staff`、`room:user:<userId>`、`room:order:<orderId>`
* `authenticateSocket` 支援 JWT token 與 guest lookup + token 雙模式
* 訂單狀態更新同時 emit `order_updated` 與 `notification`，並寫入 NotificationModel
* WebSocket 測試（`test/websocket.spec.ts`）：6 個（TC-009、TC-020、TC-023 + CORS TC-029）
* Notification API 測試（`notification.spec.ts`）：5 個（TC-021、TC-022 + mark-read）

---

## Agent 7：Backend Points / Redemption

### 範圍

* FS-011
* FS-015
* TC-012
* TC-015
* TC-024
* TC-025
* TC-026

### 任務

* 點數累積
* 每 100 元 1 點
* Guest 不累積點數
* 3 點兌換商品
* 兌換訂單
* 取消兌換退點
* Point service 測試

### 完成狀態：✅ 已完成

實際成果：

* `calculateEarnedPoints(amount)`：每 100 元 1 點（floor）
* `earnPoints`、`deductPointsForRedemption`、`returnPoints`：全部使用 atomic MongoDB update
* Line Pay confirm 成功後呼叫 `earnPoints`，冪等不重複加點
* Guest confirm：`pointsEarned = 0`，不呼叫 earnPoints
* `POST /api/orders/redeem`：須 user 角色、redeemable 商品、points ≥ 3，直接 paymentStatus = paid
* 取消 redeem 訂單 → `returnPoints` + 清除 `pointsRedeemed`
* 測試：5 個（TC-012、TC-015、TC-024、TC-025、TC-026）

---

## Agent 8：Frontend Shop / Auth / Cart

### 範圍

* FS-001
* FS-002
* FS-003
* FS-004

### 任務

* 商品列表頁
* 購物車
* 註冊頁
* 登入頁
* authStore
* cartStore
* 前端單元測試

### 完成狀態：✅ 已完成

實際成果：

* Tailwind CSS v4（`@tailwindcss/vite`）
* `ProductListView.vue`：商品列表（含圖片）、品類篩選、可兌換徽章、購物車側欄（加減移除清空）
* `LoginView.vue`、`RegisterView.vue`
* `authStore`：login / register / logout / setSession
* `cartStore`：addProduct / increment / decrement / removeProduct / clearCart / totalAmount
* Axios request interceptor 自動注入 Bearer token
* 路由守衛：已登入 → 從 /login 轉到 /products
* 測試：auth store 2 個、cart store 2 個、ProductListView 2 個

---

## Agent 9：Frontend Checkout / Orders / Guest Tracking

### 範圍

* FS-005
* FS-006
* FS-007
* FS-008
* FS-010
* FS-014

### 任務

* Checkout 頁
* 會員訂單建立流程
* 訪客訂單建立流程
* Line Pay redirect / confirm 頁
* 訂單追蹤頁
* Guest 通知歷史
* socketStore
* notificationStore

### 完成狀態：✅ 已完成

實際成果：

* `CheckoutView.vue`：member / guest 模式切換，totalAmount 由後端計算
* `LinePayConfirmView.vue`：從 URL query 讀取 transactionId，呼叫 confirm API
* `MyOrdersView.vue`：會員訂單歷史，含狀態標籤
* `GuestOrderTrackingView.vue`：lookup code + phone / guestToken 查詢，顯示通知歷史
* `order.api.ts`、`payment.api.ts`、`notification.api.ts`
* `orderStore`、`paymentStore`、`notificationStore`、`socketStore`
* socketStore：管理 Socket.io 連線、join order room、處理 `order_updated` 與 `notification` 事件
* X-Guest-Token 由 Axios interceptor 自動附加
* 測試：order store 3 個、payment store 2 個、notification store 2 個

---

## Agent 10：Frontend Staff / Admin

### 範圍

* FS-009
* FS-012
* FS-013

### 任務

* Staff 訂單管理頁
* 訂單狀態更新 UI
* Admin 商品管理頁
* Admin 使用者管理頁
* route guard

### 完成狀態：✅ 已完成

實際成果：

* `StaffOrdersView.vue`：顯示 paid + pending 訂單，一鍵 accept / reject
* `AdminProductsView.vue`：商品列表（含下架品）+ 建立 / 編輯 / 刪除表單（含 imageUrl 欄位與預覽）
* `AdminUsersView.vue`：用戶列表（分頁）+ role 選單即時更新
* `product-admin.store.ts`、`user-admin.store.ts`
* `user.api.ts`：`GET /api/users`、`PATCH /api/users/:id/role`
* 路由守衛：`canAccessRoute` / `getCurrentRouteRole`，角色不足 → `/products`，未登入 → `/login`
* 受保護路由：`/staff/orders`（staff/admin）、`/admin/products`（admin）、`/admin/users`（admin）
* 測試：route guard 2 個、staff order store 2 個（含 load / update）、product-admin store 2 個、user-admin store 2 個

---

## Agent 11：E2E / Integration Hardening

### 範圍

* TC-001 到 TC-030
* Traceability Matrix
* Definition of Done

### 任務

* 補齊測試
* 修正整合問題
* 確認 lint / test / build 全部通過
* 更新 Traceability Matrix Status
* 檢查 Definition of Done

### 完成狀態：✅ 已完成

實際成果：

**後端補齊：**

* TC-028（`cors.spec.ts`）：非允許 origin 不回傳 `access-control-allow-origin`
* TC-029（`test/websocket.spec.ts`）：Socket.io polling 不回傳非允許 origin 的 CORS header
* TC-030（`cors.spec.ts`）：OPTIONS preflight 正確回應 204
* 補上遺漏的 `order.controller.getOrderById`

**前端 Playwright E2E：**

* 安裝 `@playwright/test` 1.60 + Chromium
* `playwright.config.ts`：webServer 自動啟動 Vite dev server
* `vitest.config.ts`：加入 `include: ['src/**/*.spec.ts']` 避免 Playwright 檔案被 Vitest 收錄
* `e2e/helpers.ts`：`mockProducts`、`mockAuth` API 攔截器（不依賴真實後端）
* `e2e/product-shop.spec.ts`：3 個（商品列表、品類篩選、加入購物車）
* `e2e/auth.spec.ts`：4 個（登入表單、錯誤提示、成功登入轉址、registered user 守衛）
* `e2e/checkout.spec.ts`：4 個（空購物車、訪客表單、訂單摘要、訪客查詢頁）
* `e2e/staff-admin.spec.ts`：7 個（未登入守衛 × 3、session 遺失後守衛 × 2、normal user 導航）

---

## Agent 12：雲端部署 / Swagger / Demo Seed

### 範圍

* Phase 7：雲端部署
* Swagger API 文件
* Demo 資料 Seed 腳本
* 商品圖片欄位（imageUrl）

### 任務

* `backend/Dockerfile`（multi-stage build）
* `backend/.dockerignore`
* `docker-compose.yml`（root level，Backend + MongoDB）
* `.github/workflows/ci.yml`（lint → test → build，兩個並行 job）
* Swagger（`swagger-jsdoc` + `swagger-ui-express`，掛載於 `/api-docs`）
* `backend/src/scripts/seed.ts`（展示帳號 + 商品資料）
* `imageUrl` 欄位加入 ProductModel / validators / frontend API type
* 部署至 Render（後端）+ Vercel（前端）+ MongoDB Atlas

### 完成狀態：✅ 已完成

實際成果：

* `backend/Dockerfile`：multi-stage（builder → production），執行 `node dist/server.js`
* `backend/.dockerignore`：排除 node_modules / dist / .env / test artifacts / .git
* `docker-compose.yml`：mongodb（mongo:7）+ backend，secrets 全部由環境變數注入
* `.github/workflows/ci.yml`：push/PR 到 main 觸發，backend / frontend 並行 job
* Swagger：`/api-docs`（UI）、`/api-docs.json`（raw）；涵蓋所有 API endpoint
* `seed.ts`：3 個展示帳號（admin/staff/user，密碼 demo1234）、10 個商品（含 Unsplash 圖片）
* `ProductModel` 新增 `imageUrl: String`（optional）
* `ProductListView.vue` 顯示商品圖片（96×96 rounded object-cover）
* `AdminProductsView.vue` 新增 Image URL 輸入欄與即時預覽

**線上網址：**

| 服務 | URL |
|------|-----|
| 前端 | `https://coffee-ordering-system-delta.vercel.app` |
| 後端 | `https://coffee-ordering-system-60aw.onrender.com` |
| Swagger | `https://coffee-ordering-system-60aw.onrender.com/api-docs` |

---

# 3. 最終驗證結果

| 指標 | 結果 |
|------|------|
| 後端 lint | ✅ 通過 |
| 後端 test | ✅ 11 套件 / 58 個測試 |
| 後端 build | ✅ 通過（tsc） |
| 前端 lint | ✅ 通過 |
| 前端 unit test (Vitest) | ✅ 9 套件 / 19 個測試 |
| 前端 E2E (Playwright) | ✅ 18 個測試 |
| 前端 build | ✅ 通過（vue-tsc + vite build） |
| **自動化測試合計** | **95 個** |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| Docker / docker-compose | ✅ backend Dockerfile + docker-compose.yml |
| Swagger API 文件 | ✅ `/api-docs` |
| 雲端部署 | ✅ Render + Vercel + MongoDB Atlas |
| Demo Seed | ✅ `npm run seed` |

---

# 4. Agent 指令模板

```md
請依照桌面上的 `Coffee Real-time Ordering System 規格書.md` 開發以下範圍。

只處理以下 Spec ID，不要實作其他功能：
- FS-xxx
- FS-yyy

必須遵守：
- 第 20 章 Implementation Decisions
- 對應 Business Rules
- 對應 Acceptance Criteria
- 對應 Test Cases
- 第 10 章前後端專案結構
- 第 13 章測試規劃

完成條件：
- API / Service / UI 已依規格完成
- 對應測試已建立並通過
- npm run lint 通過
- npm test 通過
- npm run build 通過
- Traceability Matrix Status 已更新

禁止事項：
- 不要改動非本 Spec ID 的功能
- 不要任意更換套件管理器
- 不要更換測試框架
- 不要在 CI 呼叫真實 Line Pay API
- 不要使用 origin: * 的 CORS 設定
```

---

# 5. 人工 Review 重點

以下項目建議由人類或主控 agent 做最後確認：

* Line Pay sandbox 實際串接測試
* Production / Staging 環境變數
* CORS production domain
* JWT 與 guest token 安全性
* Guest 查詢碼是否足夠不可猜測
* 點數重複入帳與重複扣點風險
* UI / UX 是否符合展示需求
* Traceability Matrix Status 是否如實更新
* 所有測試是否真的覆蓋對應 TC

---

# 6. 建議開發順序

```txt
1.  Project Scaffold / Tooling          ✅ 完成
2.  Backend Auth / RBAC                 ✅ 完成
3.  Backend Product                     ✅ 完成
4.  Backend Order / Guest Order         ✅ 完成
5.  Backend Payment / Line Pay          ✅ 完成
6.  Backend Notification / WebSocket    ✅ 完成
7.  Backend Points / Redemption         ✅ 完成
8.  Frontend Shop / Auth / Cart         ✅ 完成
9.  Frontend Checkout / Orders / Guest  ✅ 完成
10. Frontend Staff / Admin              ✅ 完成
11. E2E / Integration Hardening         ✅ 完成
12. 雲端部署 / Swagger / Demo Seed      ✅ 完成
```

---

# 7. 總結

`Coffee Real-time Ordering System` 已由 12 個 AI agent 階段分工完成，共實作：

* **後端 7 個模組**：auth、products、orders、payments、notifications、points、users
* **前端 10 個畫面**：shop、login、register、checkout、my-orders、guest-tracking、line-pay-confirm、staff-orders、admin-products、admin-users
* **95 個自動化測試**：後端 integration 58 個、前端 unit 19 個、Playwright E2E 18 個
* **全部 FS-001 ～ FS-016 Accepted**，TC-001 ～ TC-030 覆蓋完整
* **完整工程化**：GitHub Actions CI、Docker、docker-compose、Swagger API 文件、Demo Seed
* **雲端部署**：Render（後端）+ Vercel（前端）+ MongoDB Atlas（資料庫）

| 服務 | URL |
|------|-----|
| 前端 | https://coffee-ordering-system-delta.vercel.app |
| 後端 | https://coffee-ordering-system-60aw.onrender.com |
| API 文件 | https://coffee-ordering-system-60aw.onrender.com/api-docs |

展示帳號（執行 `npm run seed` 後可用）：

| 角色 | Email | 密碼 |
|------|-------|------|
| 管理員 | admin@demo.com | demo1234 |
| 店員 | staff@demo.com | demo1234 |
| 會員 | user@demo.com | demo1234 |

實踐驗證：依照 FS ID 與 Phase 拆分 agent，每個 agent 只處理明確邊界並在交棒前通過 lint / test / build，可以穩定完成一個中型全端 TypeScript 系統並完整部署至雲端。
