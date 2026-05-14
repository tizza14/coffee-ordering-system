import request from 'supertest';
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

describe('CORS', () => {
  // TC-027
  it('allows configured CLIENT_ORIGIN', async () => {
    const response = await request(app)
      .options('/api/products')
      .set('Origin', env.clientOrigin);

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      env.clientOrigin
    );
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
