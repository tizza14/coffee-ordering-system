import { type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as pointService from './point.service';

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = await pointService.getPointHistory(userId);
  res.json({ data });
});
