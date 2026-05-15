import request from 'supertest';
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

describe('CORS', () => {
  // TC-027
  it.each(env.clientOrigins)('allows configured origin %s', async (origin) => {
    const response = await request(app).options('/api/products').set('Origin', origin);

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  });

  // TC-028
  it('does not echo access-control-allow-origin for disallowed origin', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('Origin', 'http://evil.example.com');

    expect(response.headers['access-control-allow-origin']).not.toBe(
      'http://evil.example.com'
    );
  });

  // TC-030
  it('responds to preflight OPTIONS', async () => {
    const response = await request(app)
      .options('/api/products')
      .set('Origin', env.clientOrigin)
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
  });
});
