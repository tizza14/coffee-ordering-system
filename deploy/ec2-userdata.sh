#!/bin/bash
# EC2 t2.micro bootstrap — Amazon Linux 2023
# Run once on first launch via User Data

set -e

# Install Docker
dnf update -y
dnf install -y docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Install AWS CLI v2 (already included on AL2023, but ensure latest)
dnf install -y aws-cli

# Create deploy script location
mkdir -p /opt/coffee-app
cat > /opt/coffee-app/run.sh << 'RUNSCRIPT'
#!/bin/bash
set -e

REGION="${AWS_REGION:-ap-northeast-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/coffee-backend"

# Login to ECR
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Pull latest image
docker pull "${ECR_URI}:latest"

# Stop existing container
docker stop coffee-backend 2>/dev/null || true
docker rm   coffee-backend 2>/dev/null || true

# Start new container (env vars injected at runtime)
docker run -d \
  --name coffee-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI="${MONGODB_URI}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-1d}" \
  -e CLIENT_ORIGIN="${CLIENT_ORIGIN}" \
  -e FRONTEND_URL="${FRONTEND_URL}" \
  -e LINE_PAY_CHANNEL_ID="${LINE_PAY_CHANNEL_ID}" \
  -e LINE_PAY_CHANNEL_SECRET="${LINE_PAY_CHANNEL_SECRET}" \
  -e LINE_PAY_API_BASE_URL="${LINE_PAY_API_BASE_URL:-https://sandbox-api-pay.line.me}" \
  -e LINE_PAY_CONFIRM_URL="${LINE_PAY_CONFIRM_URL}" \
  -e LINE_PAY_CANCEL_URL="${LINE_PAY_CANCEL_URL}" \
  "${ECR_URI}:latest"

# Clean up old images
docker image prune -f
RUNSCRIPT

chmod +x /opt/coffee-app/run.sh
