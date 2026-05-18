# AWS 部署設定指南

## 架構

```
前端  S3 + CloudFront  (靜態 Vue SPA)
後端  EC2 t2.micro     (Docker, port 3000)
DB    MongoDB Atlas M0 (免費 512MB)
映像  ECR              (Docker image registry)
```

## 一、前置準備

### 1. MongoDB Atlas
1. 註冊 https://www.mongodb.com/atlas
2. 建立 Free Tier cluster (M0, 選 AWS ap-northeast-1 東京)
3. Database Access → 新增使用者，記下密碼
4. Network Access → Add IP Address → `0.0.0.0/0`（後端 EC2 IP 固定後再改）
5. 取得連線字串：`mongodb+srv://user:pass@cluster.mongodb.net/coffee_ordering`

---

## 二、AWS 資源建立

### 2. ECR — Docker Image Registry
```bash
aws ecr create-repository --repository-name coffee-backend --region ap-northeast-1
```
記下輸出的 `repositoryUri`。

### 3. EC2 — 後端伺服器
1. 啟動 EC2 → Amazon Linux 2023 → t2.micro
2. Security Group 開放：
   - **22**（SSH，限你的 IP）
   - **3000**（後端 API，限 CloudFront IP 或暫時開 0.0.0.0）
3. IAM Role → 附加 `AmazonEC2ContainerRegistryReadOnly` 政策
4. User Data 貼上 `deploy/ec2-userdata.sh` 內容
5. 下載並保存 `.pem` 私鑰

### 4. S3 — 前端靜態檔案
```bash
# 建立 bucket（名稱全球唯一）
aws s3 mb s3://coffee-ordering-frontend --region ap-northeast-1

# 關閉公開存取封鎖（CloudFront OAC 會管控）
aws s3api put-public-access-block \
  --bucket coffee-ordering-frontend \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 5. CloudFront — 前端 CDN
1. 建立 Distribution → Origin: S3 bucket
2. Origin Access Control (OAC) → 新增並套用（不要用舊版 OAI）
3. Default Root Object: `index.html`
4. Error Pages → 403/404 → `/index.html`，HTTP 200（Vue Router SPA）
5. 複製 Distribution Domain Name（`dXXXX.cloudfront.net`）
6. 將 S3 bucket policy 更新為 CloudFront OAC 提供的 policy

---

## 三、GitHub Secrets 設定

前往 GitHub repo → Settings → Secrets → Actions → New repository secret：

| Secret 名稱 | 說明 | 範例 |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM 使用者 Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM 使用者 Secret Key | `wJalr...` |
| `AWS_REGION` | 部署區域 | `ap-northeast-1` |
| `EC2_HOST` | EC2 公有 IP 或 DNS | `13.115.xx.xx` |
| `EC2_SSH_KEY` | .pem 私鑰完整內容 | `-----BEGIN RSA...` |
| `S3_BUCKET` | S3 bucket 名稱 | `coffee-ordering-frontend` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront ID | `E1ABCDEF...` |
| `MONGODB_URI` | Atlas 連線字串 | `mongodb+srv://...` |
| `JWT_SECRET` | 隨機強密碼（32字元以上） | `openssl rand -hex 32` |
| `CLIENT_ORIGIN` | CloudFront 域名 | `https://dXXXX.cloudfront.net` |
| `FRONTEND_URL` | 同上 | `https://dXXXX.cloudfront.net` |
| `VITE_API_BASE_URL` | 後端 API URL | `http://13.115.xx.xx:3000/api` |
| `VITE_SOCKET_URL` | 後端 Socket URL | `http://13.115.xx.xx:3000` |
| `LINE_PAY_CHANNEL_ID` | Line Pay Channel ID | （Sandbox 或正式） |
| `LINE_PAY_CHANNEL_SECRET` | Line Pay Channel Secret | |
| `LINE_PAY_API_BASE_URL` | Line Pay API | `https://sandbox-api-pay.line.me` |
| `LINE_PAY_CONFIRM_URL` | 付款回呼 | `https://dXXXX.cloudfront.net/payments/line-pay/confirm` |
| `LINE_PAY_CANCEL_URL` | 取消回呼 | `https://dXXXX.cloudfront.net/payments/line-pay/cancel` |

### IAM 使用者所需權限
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["ecr:*"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["s3:PutObject","s3:DeleteObject","s3:ListBucket"], "Resource": ["arn:aws:s3:::coffee-ordering-frontend","arn:aws:s3:::coffee-ordering-frontend/*"] },
    { "Effect": "Allow", "Action": ["cloudfront:CreateInvalidation"], "Resource": "*" }
  ]
}
```

---

## 四、首次部署

```bash
# 確認 EC2 已啟動後，手動觸發第一次部署
git push origin main
```

GitHub Actions 會自動：
1. 執行 lint / test / build（CI）
2. 建置 Docker image → 推送到 ECR
3. SSH 進 EC2 → 拉取新 image → 重啟容器
4. 建置前端 → 同步到 S3 → 清除 CloudFront 快取

---

## 五、後續維護

| 操作 | 方法 |
|------|------|
| 更新部署 | `git push origin main` 自動觸發 |
| 查看後端 log | `ssh ec2-user@<IP> 'docker logs coffee-backend -f'` |
| 重啟後端 | `ssh ec2-user@<IP> 'docker restart coffee-backend'` |
| 費用估算 | EC2 t2.micro Free Tier 12月，S3+CloudFront 幾乎免費，Atlas M0 永久免費 |
