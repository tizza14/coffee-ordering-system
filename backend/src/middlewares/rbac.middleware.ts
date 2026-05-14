import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export const authorize = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'AUTH_UNAUTHORIZED', 'User not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'AUTH_FORBIDDEN', 'Access denied');
    }

    next();
  };
};
