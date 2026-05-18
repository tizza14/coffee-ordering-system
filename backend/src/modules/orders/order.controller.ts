import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import * as orderService from './order.service';

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export const createMemberOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.createMemberOrder(req.user!.id, req.body);
    res.status(201).json(order);
  }
);

export const createGuestOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.createGuestOrder(req.body);
    res.status(201).json(order);
  }
);

export const createRedeemOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.createRedeemOrder(req.user!.id, req.body);
    res.status(201).json(order);
  }
);

export const getGuestOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.getGuestOrder(
      getParam(req.params.lookupCode),
      getQueryString(req.query.phone),
      getQueryString(req.headers['x-guest-token'])
    );
    res.json(order);
  }
);

export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.getOrderById(
      getParam(req.params.id),
      req.user!
    );
    res.json(order);
  }
);

export const listStaffOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await orderService.listStaffOrders({
      status: getQueryString(req.query.status),
      paymentStatus: getQueryString(req.query.paymentStatus),
      date: getQueryString(req.query.date),
      all: getQueryString(req.query.all) === 'true',
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });
    res.json(orders);
  }
);

export const getTodayStaffSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const summary = await orderService.getTodayStaffSummary(
      getQueryString(req.query.date)
    );
    res.json(summary);
  }
);

export const getSalesReport = asyncHandler(
  async (req: Request, res: Response) => {
    const period = getQueryString(req.query.period) as
      | 'day'
      | 'week'
      | 'month'
      | 'year'
      | 'range'
      | undefined;
    if (!period || !['day', 'week', 'month', 'year', 'range'].includes(period)) {
      throw new ApiError(
        400,
        'INVALID_PERIOD',
        'period must be day, week, month, year, or range'
      );
    }
    const yearStr = getQueryString(req.query.year);
    const monthStr = getQueryString(req.query.month);
    const report = await orderService.getSalesReport(period, {
      date: getQueryString(req.query.date),
      year: yearStr ? Number(yearStr) : undefined,
      month: monthStr ? Number(monthStr) : undefined,
      startDate: getQueryString(req.query.startDate),
      endDate: getQueryString(req.query.endDate)
    });
    res.json(report);
  }
);

export const listMyOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await orderService.listMyOrders(req.user!.id);
    res.json(orders);
  }
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await orderService.updateOrderStatus(
      getParam(req.params.id),
      req.body.status,
      req.user!
    );
    res.json(order);
  }
);
