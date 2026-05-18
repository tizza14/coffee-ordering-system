import dotenv from 'dotenv';

dotenv.config();

const defaultClientOrigins = ['http://localhost:5173'];

const configuredClientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',')
  : [];

const clientOrigins = Array.from(
  new Set([...configuredClientOrigins, ...defaultClientOrigins])
)
  .map((origin) => origin.trim())
  .filter(Boolean);

const linePayChannelId =
  process.env.LINE_PAY_CHANNEL_ID ?? 'test-channel-id';
const linePayChannelSecret =
  process.env.LINE_PAY_CHANNEL_SECRET ?? 'test-channel-secret';
const defaultFrontendUrl =
  process.env.FRONTEND_URL ?? 'http://localhost:5173';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coffee_ordering',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  clientOrigins,
  clientOrigin: clientOrigins[0],
  linePayChannelId,
  linePayChannelSecret,
  linePayMock:
    process.env.LINE_PAY_MOCK === 'true' ||
    (process.env.NODE_ENV !== 'test' &&
      (['test-channel-id', 'your-channel-id'].includes(linePayChannelId) ||
        ['test-channel-secret', 'your-channel-secret'].includes(
          linePayChannelSecret
        ))),
  linePayApiBaseUrl:
    process.env.LINE_PAY_API_BASE_URL ?? 'https://sandbox-api-pay.line.me',
  linePayConfirmUrl:
    process.env.LINE_PAY_CONFIRM_URL ??
    `${defaultFrontendUrl}/payments/line-pay/confirm`,
  linePayCancelUrl:
    process.env.LINE_PAY_CANCEL_URL ??
    `${defaultFrontendUrl}/payments/line-pay/cancel`,
  vapidPublicKey:  process.env.VAPID_PUBLIC_KEY  ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidEmail:      process.env.VAPID_EMAIL        ?? 'admin@example.com'
};
