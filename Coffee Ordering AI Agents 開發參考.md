# Coffee Ordering AI Agents 開發參考

本文件用於搭配 `Coffee Real-time Ordering System 規格書.md`，作為 AI agents 分工開發的參考。

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

---

# 3. Agent 指令模板

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

# 4. 人工 Review 重點

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

# 5. 建議開發順序

```txt
1. Project Scaffold / Tooling
2. Backend Auth / RBAC
3. Backend Product
4. Backend Order / Guest Order
5. Backend Payment / Line Pay
6. Backend Notification / WebSocket
7. Backend Points / Redemption
8. Frontend Shop / Auth / Cart
9. Frontend Checkout / Orders / Guest Tracking
10. Frontend Staff / Admin
11. E2E / Integration Hardening
```

---

# 6. 總結

目前 `Coffee Real-time Ordering System 規格書.md` 已足以讓 AI agents 分階段開發整個系統。

最佳做法不是一次交給單一 agent，而是依照 FS ID 與 Phase 拆分，讓每個 agent 都有明確邊界、明確測試、明確驗收條件。
