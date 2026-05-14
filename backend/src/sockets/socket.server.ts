import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { corsOptions } from '../app';
import { OrderModel } from '../modules/orders/order.model';
import { authenticateSocket } from './socket.auth';

let io: Server | undefined;

interface OrderUpdatedPayload {
  status?: string;
  updatedAt?: Date | string;
}

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(authenticateSocket);

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.data.user?.id || 'Guest'})`);

    socket.on('join_room', async (data: { room: string }) => {
      const { room } = data;
      const user = socket.data.user;
      const guest = socket.data.guest;

      if (room === 'room:staff') {
        if (user?.role === 'staff' || user?.role === 'admin') {
          socket.join(room);
        }
        return;
      }

      if (room.startsWith('room:user:')) {
        const userId = room.split(':')[2];
        if (user?.id === userId || user?.role === 'admin') {
          socket.join(room);
        }
        return;
      }

      if (room.startsWith('room:order:')) {
        const orderId = room.split(':')[2];
        if (user?.role === 'staff' || user?.role === 'admin') {
          socket.join(room);
          return;
        }

        if (user) {
          const order = await OrderModel.findOne({ _id: orderId, userId: user.id });
          if (order) {
            socket.join(room);
          }
          return;
        }

        if (guest?.orderId === orderId) {
          socket.join(room);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function emitOrderUpdated(orderId: string, data: OrderUpdatedPayload) {
  if (!io) return;
  getIo().to(`room:order:${orderId}`).emit('order_updated', { orderId, ...data });
}

export function emitNotification(room: string, notification: unknown) {
  if (!io) return;
  getIo().to(room).emit('notification', notification);
}
