# Render + Vercel 部署指南

## 架構

```
前端  Vercel         (靜態 Vue SPA，自動 CI/CD)
後端  Render         (Docker，free tier)
DB    MongoDB Atlas  (免費 M0，512 MB)
```

---

## 一、MongoDB Atlas（必須先完成）

1. 前往 https://www.mongodb.com/atlas 建立免費帳號
2. 建立 Free Tier cluster（M0，選離台灣近的區域）
3. **Database Access** → Add Database User（記下帳號密碼）
4. **Network Access** → Add IP Address → `0.0.0.0/0`（允許所有 IP，因為 Render 沒有固定 IP）
5. **Connect** → Drivers → 取得連線字串：
   ```
   mongodb+srv://<user>:<password>@cluster.mongodb.net/coffee_ordering
   ```

---

## 二、Render 後端部署

### 2-1 建立 Web Service

1. 前往 https://render.com → New → **Web Service**
2. Connect GitHub repo
3. 設定：
   - **Root Directory**: `backend`（若使用 `render.yaml` 則略過）
   - **Build Command**: *(留空，由 Dockerfile 處理)*
   - **Start Command**: *(留空，由 Dockerfile CMD 處理)*
   - **Docker** → 選 `backend/Dockerfile`

   > 若 repo 根目錄有 `render.yaml`，Render 會自動偵測並套用設定，不需手動填上述欄位。

### 2-2 設定環境變數（必須）

前往 Service → **Environment** → Add the following:

| 變數名稱 | 值 | 說明 |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` 產生的值 | 32 字元以上強密碼 |
| `MONGODB_URI` | `mongodb+srv://...` | Atlas 連線字串 |
| `LINE_PAY_CHANNEL_ID` | *(Line Pay sandbox/正式 ID)* | |
| `LINE_PAY_CHANNEL_SECRET` | *(Line Pay sandbox/正式 Secret)* | |
| `CLIENT_ORIGIN` | `https://<your-vercel-domain>.vercel.app` | Vercel 前端 URL |
| `FRONTEND_URL` | `https://<your-vercel-domain>.vercel.app` | 付款回導與系統產生前端連結的基準 URL |
| `LINE_PAY_CONFIRM_URL` | `https://<your-vercel-domain>.vercel.app/payments/line-pay/confirm` | |
| `LINE_PAY_CANCEL_URL` | `https://<your-vercel-domain>.vercel.app/payments/line-pay/cancel` | |

> **注意**：`CLIENT_ORIGIN` 即 CORS 允許來源，必須與前端實際 URL 完全一致（含 https://，不含結尾 /）。`FRONTEND_URL` 也需使用正式前端網址，不可使用 `localhost`。

### 2-3 取得後端 URL

部署完成後，Render 會給你一個 URL，格式類似：
```
https://coffee-ordering-backend.onrender.com
```
記下此 URL，前端需要用到。

---

## 三、Vercel 前端部署

### 3-1 建立 Vercel 專案

1. 前往 https://vercel.com → Add New Project → Import GitHub repo
2. **Framework Preset**: Vite（Vercel 自動偵測）
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`（預設即可）
5. **Output Directory**: `dist`（預設即可）

### 3-2 設定環境變數（必須）

前往 Project → **Settings** → **Environment Variables**：

| 變數名稱 | 值 | 說明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://coffee-ordering-backend.onrender.com/api` | Render 後端 API URL |
| `VITE_SOCKET_URL` | `https://coffee-ordering-backend.onrender.com` | Render 後端 Socket URL |

> **重要**：`VITE_*` 變數是 **build time** 嵌入，設定後需重新 deploy（Redeploy）才會生效。

### 3-3 確認 `vercel.json`

repo 中已有 `frontend/vercel.json`，確保 SPA routing 正常：
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 四、回到 Render — 補設前端 URL

前端部署後取得正式 Vercel URL（如 `https://coffee-ordering-xyz.vercel.app`），回到 Render Service → Environment 更新：

- `CLIENT_ORIGIN` → `https://coffee-ordering-xyz.vercel.app`
- `FRONTEND_URL` → `https://coffee-ordering-xyz.vercel.app`
- `LINE_PAY_CONFIRM_URL` → `https://coffee-ordering-xyz.vercel.app/payments/line-pay/confirm`
- `LINE_PAY_CANCEL_URL` → `https://coffee-ordering-xyz.vercel.app/payments/line-pay/cancel`

儲存後 Render 會自動重新部署。

---

## 五、常見錯誤排查

| 錯誤訊息 | 原因 | 解法 |
|---|---|---|
| `JWT_SECRET must be set in production` | Render 未設定 `JWT_SECRET` | Render → Environment → 新增 `JWT_SECRET` |
| `MongoServerError: bad auth` | `MONGODB_URI` 帳號密碼錯誤 | 重新確認 Atlas 使用者密碼，密碼中特殊字元需 URL encode |
| CORS 錯誤 | `CLIENT_ORIGIN` 與前端 URL 不符 | 確認 Render 的 `CLIENT_ORIGIN` 與 Vercel 域名完全一致 |
| 前端 API 打不到後端 | `VITE_API_BASE_URL` 設錯 | Vercel → Environment Variables 更新後 Redeploy |
| Socket.io 無法連線 | `VITE_SOCKET_URL` 設錯 | 同上 |
| 訪客結帳後跳到 `localhost:5173` 或拒絕連線 | Render 的 `FRONTEND_URL` / `LINE_PAY_CONFIRM_URL` / `LINE_PAY_CANCEL_URL` 指到本機 | 改成正式 Vercel URL 後重新部署 Render；production 後端也會避免產生 localhost 回導 |
| 訪客模式沒有點餐紀錄頁 | 權限設計如此，訪客訂單不綁定會員帳號 | 使用「訂單追蹤」查看訪客訂單；登入會員後建立的新訂單才會出現在會員點餐紀錄 |
| Render free tier 休眠 | 閒置 15 分鐘後服務進入休眠，首次請求需 30-60 秒喚醒 | 升級 Render 方案，或接受延遲 |

---

## 六、Web Push（可選）

若需啟用 Web Push 通知，先產生 VAPID 金鑰：
```bash
npx web-push generate-vapid-keys
```

然後在 Render 環境變數中新增：
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`（任意 email）

在 Vercel 環境變數中新增：
- `VITE_VAPID_PUBLIC_KEY`（與 Render 的 `VAPID_PUBLIC_KEY` 相同值）
