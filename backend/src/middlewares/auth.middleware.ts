import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'AUTH_UNAUTHORIZED', 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = {
      id: payload.userId,
      role: payload.role
    };
    next();
  } catch {
    throw new ApiError(401, 'AUTH_INVALID_TOKEN', 'Invalid or expired token');
  }
};
