import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { TokenPayload } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import * as paymentService from './payment.service';

function getActor(req: Request) {
  const authHeader = req.headers.authorization;
  const guestToken =
    typeof req.headers['x-guest-token'] === 'string'
      ? req.headers['x-guest-token']
      : undefined;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(
        authHeader.split(' ')[1],
        env.jwtSecret
      ) as TokenPayload;
      return {
        user: { id: payload.userId, role: payload.role },
        guestToken
      };
    } catch {
      throw new ApiError(401, 'AUTH_INVALID_TOKEN', 'Invalid or expired token');
    }
  }

  return { guestToken };
}

export const requestLinePay = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await paymentService.requestLinePay(
      req.body.orderId,
      getActor(req)
    );
    res.status(201).json(result);
  }
);

export const confirmLinePay = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await paymentService.confirmLinePay(
      req.body.orderId,
      req.body.transactionId,
      getActor(req)
    );
    res.json(result);
  }
);

export const cancelLinePay = asyncHandler(
  async (req: Request, res: Response) => {
    const orderId =
      typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
    if (!orderId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'orderId is required');
    }
    const result = await paymentService.cancelLinePay(orderId, getActor(req));
    res.json(result);
  }
);
