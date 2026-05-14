import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import type { ExtendedError } from 'socket.io/dist/namespace';
import { env } from '../config/env';
import { OrderModel } from '../modules/orders/order.model';
import { hashGuestToken } from '../utils/crypto';

export async function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  const token = socket.handshake.auth.token;
  const guestToken = socket.handshake.auth.guestToken;
  const orderLookupCode = socket.handshake.auth.orderLookupCode;

  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as {
        userId: string;
        role: string;
      };
      socket.data.user = { id: payload.userId, role: payload.role };
      return next();
    } catch {
      // If token is present but invalid, we don't necessarily reject if guest auth might work
      // but usually if token is provided, it should be valid.
      // However, we'll continue to check guest auth.
    }
  }

  if (guestToken && orderLookupCode) {
    try {
      const order = await OrderModel.findOne({ orderLookupCode });
      if (order && order.guestTokenHash === hashGuestToken(guestToken)) {
        socket.data.guest = {
          orderId: String(order._id),
          lookupCode: orderLookupCode
        };
        return next();
      }
    } catch {
      // Ignore
    }
  }

  // Allow connection even without auth, but restricted rooms will be blocked in join_room
  next();
}
