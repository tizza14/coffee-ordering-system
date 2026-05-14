import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message, code: err.code });
    return;
  }

  if (err?.name === 'ZodError') {
    res
      .status(400)
      .json({ message: 'Validation error', code: 'VALIDATION_ERROR' });
    return;
  }

  res
    .status(500)
    .json({ message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
};
