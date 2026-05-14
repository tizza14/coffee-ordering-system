import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { initSocketServer } from './sockets/socket.server';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Backend listening on ${env.port}`);
  });
}

void bootstrap();
