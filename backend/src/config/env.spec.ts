describe('env', () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = originalEnv;
  });

  it('does not use localhost Line Pay redirect URLs in production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'test-secret',
      CLIENT_ORIGIN: 'https://coffee-ordering-system-delta.vercel.app',
      LINE_PAY_CONFIRM_URL: 'http://localhost:5173/payments/line-pay/confirm',
      LINE_PAY_CANCEL_URL: 'http://localhost:5173/payments/line-pay/cancel'
    };

    jest.isolateModules(() => {
      const { env } = require('./env') as typeof import('./env');

      expect(env.linePayConfirmUrl).toBe(
        'https://coffee-ordering-system-delta.vercel.app/payments/line-pay/confirm'
      );
      expect(env.linePayCancelUrl).toBe(
        'https://coffee-ordering-system-delta.vercel.app/payments/line-pay/cancel'
      );
    });
  });
});
