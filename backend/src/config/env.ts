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

function isLocalFrontendUrl(value: string) {
  try {
    const { hostname } = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

function getProductionFrontendUrl() {
  const configuredFrontendUrl = process.env.FRONTEND_URL;
  if (configuredFrontendUrl && !isLocalFrontendUrl(configuredFrontendUrl)) {
    return configuredFrontendUrl;
  }

  return (
    clientOrigins.find((origin) => !isLocalFrontendUrl(origin)) ??
    defaultFrontendUrl
  );
}

function getLinePayRedirectUrl(envKey: 'LINE_PAY_CONFIRM_URL' | 'LINE_PAY_CANCEL_URL', path: string) {
  const configuredUrl = process.env[envKey];
  if (
    configuredUrl &&
    (process.env.NODE_ENV !== 'production' || !isLocalFrontendUrl(configuredUrl))
  ) {
    return configuredUrl;
  }

  const frontendUrl =
    process.env.NODE_ENV === 'production'
      ? getProductionFrontendUrl()
      : defaultFrontendUrl;
  return `${frontendUrl.replace(/\/$/, '')}${path}`;
}

const jwtSecret = process.env.JWT_SECRET ?? 'change-me';
if (process.env.NODE_ENV === 'production' && jwtSecret === 'change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coffee_ordering',
  jwtSecret,
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
  linePayConfirmUrl: getLinePayRedirectUrl(
    'LINE_PAY_CONFIRM_URL',
    '/payments/line-pay/confirm'
  ),
  linePayCancelUrl: getLinePayRedirectUrl(
    'LINE_PAY_CANCEL_URL',
    '/payments/line-pay/cancel'
  ),
  vapidPublicKey:  process.env.VAPID_PUBLIC_KEY  ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidEmail:      process.env.VAPID_EMAIL        ?? 'admin@example.com',
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey:    process.env.CLOUDINARY_API_KEY    ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? ''
};
