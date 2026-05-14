import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coffee_ordering',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  linePayChannelId: process.env.LINE_PAY_CHANNEL_ID ?? 'test-channel-id',
  linePayChannelSecret:
    process.env.LINE_PAY_CHANNEL_SECRET ?? 'test-channel-secret',
  linePayApiBaseUrl:
    process.env.LINE_PAY_API_BASE_URL ?? 'https://sandbox-api-pay.line.me',
  linePayConfirmUrl:
    process.env.LINE_PAY_CONFIRM_URL ??
    'http://localhost:5173/payments/line-pay/confirm',
  linePayCancelUrl:
    process.env.LINE_PAY_CANCEL_URL ??
    'http://localhost:5173/payments/line-pay/cancel'
};
