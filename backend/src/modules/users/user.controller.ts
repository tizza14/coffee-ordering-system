import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as userService from './user.service';

function parsePage(value: unknown) {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseLimit(value: unknown) {
  const limit = Number(value ?? 20);
  if (!Number.isInteger(limit) || limit < 1) return 20;
  return Math.min(limit, 100);
}

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers({
    page: parsePage(req.query.page),
    limit: parseLimit(req.query.limit)
  });

  res.json(result);
});

export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await userService.updateUserRole(id, req.body);
    res.json(user);
  }
);
