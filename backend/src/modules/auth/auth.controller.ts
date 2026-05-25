import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';
import { UserModel } from '../users/user.model';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.id).select('name email role points');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    points: user.points ?? 0
  });
});
