import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as orderService from './order.service';

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export const createMemberOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createMemberOrder(req.user!.id, req.body);
  res.status(201).json(order);
});

export const createGuestOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createGuestOrder(req.body);
  res.status(201).json(order);
});

export const createRedeemOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createRedeemOrder(req.user!.id, req.body);
  res.status(201).json(order);
});

export const getGuestOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getGuestOrder(
    getParam(req.params.lookupCode),
    getQueryString(req.query.phone),
    getQueryString(req.headers['x-guest-token'])
  );
  res.json(order);
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(getParam(req.params.id), req.user!);
  res.json(order);
});

export const listStaffOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await orderService.listStaffOrders();
  res.json(orders);
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.listMyOrders(req.user!.id);
  res.json(orders);
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateOrderStatus(
    getParam(req.params.id),
    req.body.status,
    req.user!
  );
  res.json(order);
});
