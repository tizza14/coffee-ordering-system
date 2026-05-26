import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getParam, parsePage, parseLimit } from '../../utils/request';
import * as userService from './user.service';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers({
    page: parsePage(req.query.page),
    limit: parseLimit(req.query.limit)
  });

  res.json(result);
});

export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const user = await userService.updateUserRole(id, req.body);
    res.json(user);
  }
);
