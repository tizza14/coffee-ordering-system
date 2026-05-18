import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import {
  hashGuestToken,
  createLookupCode,
  createGuestToken
} from '../../utils/crypto';
import { ProductModel } from '../products/product.model';
import * as pointService from '../points/point.service';
import * as notificationService from '../notifications/notification.service';
import * as socketServer from '../../sockets/socket.server';
import { sendPushToUser } from '../../utils/webPush';
import { OrderModel, type OrderDocument } from './order.model';
import type {
  CreateGuestOrderInput,
  CreateOrderInput,
  CreateRedeemOrderInput
} from './order.validators';

const allowedTransitions: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: []
};

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type PaymentStatus =
  | 'unpaid'
  | 'payment_pending'
  | 'paid'
  | 'payment_failed'
  | 'refunded';

interface SoldItemSummary {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

function taipeiMidnightUTC(year: number, month: number, day: number): Date {
  // month is 1-indexed; Date.UTC uses 0-indexed but handles overflow correctly
  return new Date(Date.UTC(year, month - 1, day) - TAIPEI_OFFSET_MS);
}

function parseDateStr(s: string): [number, number, number] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new ApiError(400, 'INVALID_DATE', `Invalid date format: ${s}`);
  }
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    throw new ApiError(400, 'INVALID_DATE', `Invalid date value: ${s}`);
  }
  return [y, m, d];
}

function getTaipeiDayRange(dateStrOrNow?: string | Date, _now = new Date()) {
  if (dateStrOrNow instanceof Date || dateStrOrNow === undefined) {
    const now = dateStrOrNow ?? _now;
    const taipeiNow = new Date(now.getTime() + TAIPEI_OFFSET_MS);
    const start = taipeiMidnightUTC(
      taipeiNow.getUTCFullYear(),
      taipeiNow.getUTCMonth() + 1,
      taipeiNow.getUTCDate()
    );
    return { start, end: new Date(start.getTime() + 86400000) };
  }
  const [y, m, d] = parseDateStr(dateStrOrNow);
  const start = taipeiMidnightUTC(y, m, d);
  return { start, end: new Date(start.getTime() + 86400000) };
}

interface TimeBucket {
  start: Date;
  end: Date;
  date: string;
  label: string;
}

function getWeekBuckets(dateStr: string): TimeBucket[] {
  const [y, m, d] = parseDateStr(dateStr);
  const dayStart = taipeiMidnightUTC(y, m, d);
  const dow = new Date(dayStart.getTime() + TAIPEI_OFFSET_MS).getUTCDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const mondayUTC = new Date(dayStart.getTime() - daysFromMon * 86400000);
  const dayLabels = ['(一)', '(二)', '(三)', '(四)', '(五)', '(六)', '(日)'];
  return Array.from({ length: 7 }, (_, i) => {
    const start = new Date(mondayUTC.getTime() + i * 86400000);
    const end = new Date(start.getTime() + 86400000);
    const t = new Date(start.getTime() + TAIPEI_OFFSET_MS);
    const date = t.toISOString().slice(0, 10);
    return { start, end, date, label: `${t.getUTCMonth() + 1}/${t.getUTCDate()} ${dayLabels[i]}` };
  });
}

function getMonthBuckets(year: number, month: number): TimeBucket[] {
  const firstDay = taipeiMidnightUTC(year, month, 1);
  const nextMonthFirst = taipeiMidnightUTC(year, month + 1, 1);
  const daysInMonth = Math.round((nextMonthFirst.getTime() - firstDay.getTime()) / 86400000);
  return Array.from({ length: daysInMonth }, (_, i) => {
    const start = new Date(firstDay.getTime() + i * 86400000);
    const end = new Date(start.getTime() + 86400000);
    const t = new Date(start.getTime() + TAIPEI_OFFSET_MS);
    return {
      start,
      end,
      date: t.toISOString().slice(0, 10),
      label: `${t.getUTCDate()}日`
    };
  });
}

function getYearBuckets(year: number): TimeBucket[] {
  return Array.from({ length: 12 }, (_, i) => {
    const start = taipeiMidnightUTC(year, i + 1, 1);
    const end = taipeiMidnightUTC(year, i + 2, 1);
    return {
      start,
      end,
      date: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: `${i + 1}月`
    };
  });
}

export interface SalesBucket {
  label: string;
  date: string;
  revenue: number;
  orders: number;
  items: number;
}

function getCustomRangeBuckets(startDate: string, endDate: string): TimeBucket[] {
  const [sy, sm, sd] = parseDateStr(startDate);
  const [ey, em, ed] = parseDateStr(endDate);
  const startUTC = taipeiMidnightUTC(sy, sm, sd);
  const endUTC = taipeiMidnightUTC(ey, em, ed + 1);
  const daysCount = Math.round((endUTC.getTime() - startUTC.getTime()) / 86400000);
  return Array.from({ length: daysCount }, (_, i) => {
    const start = new Date(startUTC.getTime() + i * 86400000);
    const end = new Date(start.getTime() + 86400000);
    const t = new Date(start.getTime() + TAIPEI_OFFSET_MS);
    return {
      start,
      end,
      date: t.toISOString().slice(0, 10),
      label: `${t.getUTCMonth() + 1}/${t.getUTCDate()}`
    };
  });
}

export interface SalesReport {
  period: 'day' | 'week' | 'month' | 'year' | 'range';
  label: string;
  totalRevenue: number;
  totalOrders: number;
  totalItems: number;
  soldItems: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  breakdown: SalesBucket[];
}

function toOrderResponse(order: OrderDocument) {
  return {
    id: String(order._id),
    userId: order.userId ? String(order.userId) : undefined,
    guestInfo: order.guestInfo,
    orderLookupCode: order.orderLookupCode,
    items: order.items.map((item) => ({
      productId: String(item.productId),
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })),
    totalAmount: order.totalAmount,
    orderType: order.orderType,
    paymentStatus: order.paymentStatus,
    paidAmount: order.paidAmount,
    pointsEarned: order.pointsEarned,
    pointsRedeemed: order.pointsRedeemed,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

async function buildOrderItems(items: CreateOrderInput['items']) {
  const productIds = items.map((item) => item.productId);
  const products = await ProductModel.find({
    _id: { $in: productIds },
    isAvailable: true
  });
  const productById = new Map(
    products.map((product) => [String(product._id), product])
  );

  const orderItems = items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Product not found');
    }

    return {
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity
    };
  });

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { orderItems, totalAmount };
}

export async function createMemberOrder(
  userId: string,
  input: CreateOrderInput
) {
  const { orderItems, totalAmount } = await buildOrderItems(input.items);
  const order = await OrderModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    items: orderItems,
    totalAmount,
    orderType: 'purchase'
  });

  return toOrderResponse(order);
}

export async function createGuestOrder(input: CreateGuestOrderInput) {
  const { orderItems, totalAmount } = await buildOrderItems(input.items);
  const guestToken = createGuestToken();
  const order = await OrderModel.create({
    guestInfo: input.guestInfo,
    orderLookupCode: createLookupCode(),
    guestTokenHash: hashGuestToken(guestToken),
    guestTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    items: orderItems,
    totalAmount
  });

  return {
    ...toOrderResponse(order),
    guestToken
  };
}

export async function createRedeemOrder(
  userId: string,
  input: CreateRedeemOrderInput
) {
  const product = await ProductModel.findOne({
    _id: input.productId,
    isAvailable: true,
    isRedeemable: true
  });

  if (!product) {
    throw new ApiError(
      400,
      'PRODUCT_NOT_REDEEMABLE',
      'Product is not redeemable'
    );
  }

  const remainingPoints = await pointService.deductPointsForRedemption(userId);
  let order: OrderDocument;
  try {
    order = await OrderModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      items: [
        {
          productId: product._id,
          name: product.name,
          price: 0,
          quantity: 1
        }
      ],
      totalAmount: 0,
      orderType: 'redeem',
      paymentStatus: 'paid',
      pointsRedeemed: pointService.REDEEM_POINTS_COST
    });
  } catch (err) {
    await pointService.returnPoints(userId, pointService.REDEEM_POINTS_COST);
    throw err;
  }

  await notifyStatusUpdate(order);

  return {
    ...toOrderResponse(order),
    remainingPoints
  };
}

export async function getGuestOrder(
  lookupCode: string,
  phone?: string,
  guestToken?: string
) {
  const normalizedLookupCode = lookupCode.trim().toUpperCase();
  const normalizedPhone = phone?.trim();
  const normalizedGuestToken = guestToken?.trim();
  const orderLookupQuery = mongoose.isValidObjectId(normalizedLookupCode)
    ? {
        $or: [
          { orderLookupCode: normalizedLookupCode },
          { _id: new mongoose.Types.ObjectId(normalizedLookupCode) }
        ]
      }
    : { orderLookupCode: normalizedLookupCode };
  const order = await OrderModel.findOne(orderLookupQuery);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const phoneMatches = Boolean(
    normalizedPhone && order.guestInfo?.phone === normalizedPhone
  );
  const tokenNotExpired =
    !order.guestTokenExpiresAt || order.guestTokenExpiresAt > new Date();
  const tokenMatches = Boolean(
    normalizedGuestToken &&
      order.guestTokenHash === hashGuestToken(normalizedGuestToken) &&
      tokenNotExpired
  );

  if (!phoneMatches && !tokenMatches) {
    throw new ApiError(
      401,
      'GUEST_LOOKUP_INVALID',
      'Invalid guest lookup information'
    );
  }

  return toOrderResponse(order);
}

export interface StaffOrdersQuery {
  status?: string;
  paymentStatus?: string;
  date?: string;
  all?: boolean;
  page: number;
  limit: number;
}

export async function listStaffOrders(
  query: StaffOrdersQuery = { page: 1, limit: 20 }
) {
  const filter: Record<string, unknown> = {};
  if (query.date) {
    const { start, end } = getTaipeiDayRange(query.date);
    filter.createdAt = { $gte: start, $lt: end };
  }
  if (query.status) {
    filter.status = query.status;
  } else if (!query.all && !query.paymentStatus && !query.date) {
    filter.paymentStatus = 'paid';
    filter.status = 'pending';
  }
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  const skip = (query.page - 1) * query.limit;
  const orderQuery = OrderModel.find(filter).sort({ createdAt: -1 });
  if (!query.all) {
    orderQuery.skip(skip).limit(query.limit);
  }

  const [orders, total] = await Promise.all([
    orderQuery,
    OrderModel.countDocuments(filter)
  ]);

  return {
    data: orders.map(toOrderResponse),
    pagination: { page: query.page, limit: query.limit, total }
  };
}

export async function getTodayStaffSummary(date?: string, now = new Date()) {
  const { start, end } = date ? getTaipeiDayRange(date) : getTaipeiDayRange(now);
  const taipeiDate = date ?? new Date(now.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 10);
  const orders = await OrderModel.find({
    createdAt: { $gte: start, $lt: end }
  });

  const statusCounts: Record<OrderStatus, number> = {
    pending: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0
  };
  const paymentStatusCounts: Record<PaymentStatus, number> = {
    unpaid: 0,
    payment_pending: 0,
    paid: 0,
    payment_failed: 0,
    refunded: 0
  };

  let paidRevenue = 0;
  let paidOrders = 0;
  let guestOrders = 0;
  let memberOrders = 0;
  let itemQuantity = 0;
  const soldItemsByProduct = new Map<string, SoldItemSummary>();

  for (const order of orders) {
    statusCounts[order.status as OrderStatus] += 1;
    paymentStatusCounts[order.paymentStatus as PaymentStatus] += 1;

    if (order.paymentStatus === 'paid') {
      paidOrders += 1;
      paidRevenue += order.paidAmount || order.totalAmount;
      itemQuantity += order.items.reduce((sum, item) => sum + item.quantity, 0);

      for (const item of order.items) {
        const productId = String(item.productId);
        const current = soldItemsByProduct.get(productId) ?? {
          productId,
          name: item.name,
          quantity: 0,
          revenue: 0
        };
        current.quantity += item.quantity;
        current.revenue += item.price * item.quantity;
        soldItemsByProduct.set(productId, current);
      }
    }

    if (order.userId) {
      memberOrders += 1;
    } else {
      guestOrders += 1;
    }
  }

  return {
    date: taipeiDate,
    timezone: 'Asia/Taipei',
    totalOrders: orders.length,
    paidOrders,
    paidRevenue,
    averagePaidOrderValue:
      paidOrders > 0 ? Math.round(paidRevenue / paidOrders) : 0,
    itemQuantity,
    soldItems: Array.from(soldItemsByProduct.values()).sort(
      (left, right) => right.quantity - left.quantity
    ),
    guestOrders,
    memberOrders,
    statusCounts,
    paymentStatusCounts
  };
}

export async function getOrderById(
  orderId: string,
  actor: { id: string; role: string }
) {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  if (actor.role === 'staff' || actor.role === 'admin') {
    return toOrderResponse(order);
  }

  if (order.userId && String(order.userId) === actor.id) {
    return toOrderResponse(order);
  }

  throw new ApiError(403, 'ORDER_ACCESS_DENIED', 'Cannot access this order');
}

export async function listMyOrders(userId: string) {
  const orders = await OrderModel.find({
    userId: new mongoose.Types.ObjectId(userId)
  }).sort({
    createdAt: -1
  });
  return { data: orders.map(toOrderResponse) };
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor: { id: string; role: string }
) {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  if (actor.role === 'user') {
    const ownsOrder = order.userId && String(order.userId) === actor.id;
    if (
      !ownsOrder ||
      order.status !== 'pending' ||
      nextStatus !== 'cancelled'
    ) {
      throw new ApiError(
        403,
        'ORDER_ACCESS_DENIED',
        'Cannot update this order'
      );
    }

    order.status = nextStatus;
    await order.save();
    await returnRedeemedPointsIfCancelled(order);

    await notifyStatusUpdate(order);

    return toOrderResponse(order);
  }

  if (!allowedTransitions[order.status].includes(nextStatus)) {
    throw new ApiError(
      400,
      'INVALID_STATUS_TRANSITION',
      'Invalid order status transition'
    );
  }

  if (
    order.status === 'pending' &&
    nextStatus === 'accepted' &&
    order.paymentStatus !== 'paid'
  ) {
    throw new ApiError(400, 'PAYMENT_NOT_PAID', 'Order is not paid');
  }

  order.status = nextStatus;
  await order.save();
  await returnRedeemedPointsIfCancelled(order);

  await notifyStatusUpdate(order);

  return toOrderResponse(order);
}

async function returnRedeemedPointsIfCancelled(order: OrderDocument) {
  if (
    order.status === 'cancelled' &&
    order.orderType === 'redeem' &&
    order.userId &&
    order.pointsRedeemed > 0
  ) {
    const originalPointsRedeemed = order.pointsRedeemed;
    await pointService.returnPoints(String(order.userId), originalPointsRedeemed);
    await OrderModel.updateOne(
      { _id: order._id, pointsRedeemed: originalPointsRedeemed },
      { $set: { pointsRedeemed: 0 } }
    );
  }
}

async function notifyStatusUpdate(order: OrderDocument) {
  const message = `Order ${order.orderLookupCode || order._id} status updated to ${order.status}`;

  // Create notification for user/guest
  const notification = await notificationService.createNotification({
    userId: order.userId ? String(order.userId) : undefined,
    guestOrderLookupCode: order.orderLookupCode || undefined,
    orderId: String(order._id),
    audience: order.userId ? 'user' : 'guest',
    type: 'order_status_updated',
    message
  });

  // Emit to order room (both user and staff might be listening)
  socketServer.emitOrderUpdated(String(order._id), {
    status: order.status,
    updatedAt: order.updatedAt
  });

  socketServer.emitNotification(`room:order:${order._id}`, notification);

  // Emit notification to user room
  if (order.userId) {
    socketServer.emitNotification(`room:user:${order.userId}`, notification);
  }

  // Also notify staff if it's a significant change or just all changes for now
  socketServer.emitNotification('room:staff', {
    type: 'order_status_updated',
    orderId: String(order._id),
    status: order.status,
    message
  });

  // Web Push: notify user when order is ready for pickup
  if (order.status === 'ready' && order.userId) {
    void sendPushToUser(String(order.userId), {
      title: '您的餐點已完成',
      body: `訂單 ${order.orderLookupCode ?? order._id} 請到櫃檯取餐。`,
      url: '/orders/my'
    });
  }
}

export async function getSalesReport(
  period: 'day' | 'week' | 'month' | 'year' | 'range',
  query: { date?: string; year?: number; month?: number; startDate?: string; endDate?: string }
): Promise<SalesReport> {
  const now = new Date();
  const taipeiNow = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  const todayStr = taipeiNow.toISOString().slice(0, 10);

  let buckets: TimeBucket[];
  let reportLabel: string;

  if (period === 'day') {
    const date = query.date ?? todayStr;
    const { start, end } = getTaipeiDayRange(date);
    buckets = [{ start, end, date, label: date }];
    reportLabel = date;
  } else if (period === 'week') {
    const date = query.date ?? todayStr;
    buckets = getWeekBuckets(date);
    reportLabel = `${buckets[0].date} ~ ${buckets[6].date}`;
  } else if (period === 'month') {
    const year = query.year ?? taipeiNow.getUTCFullYear();
    const month = query.month ?? (taipeiNow.getUTCMonth() + 1);
    buckets = getMonthBuckets(year, month);
    reportLabel = `${year}年${month}月`;
  } else if (period === 'range') {
    const startDate = query.startDate ?? todayStr;
    const endDate = query.endDate ?? todayStr;
    if (startDate > endDate) {
      throw new ApiError(400, 'INVALID_DATE_RANGE', 'startDate must not be after endDate');
    }
    buckets = getCustomRangeBuckets(startDate, endDate);
    if (buckets.length > 366) {
      throw new ApiError(400, 'DATE_RANGE_TOO_LARGE', 'Date range cannot exceed 366 days');
    }
    reportLabel = `${startDate} ~ ${endDate}`;
  } else {
    const year = query.year ?? taipeiNow.getUTCFullYear();
    buckets = getYearBuckets(year);
    reportLabel = `${year}年`;
  }

  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;

  const orders = await OrderModel.find({
    paymentStatus: 'paid',
    createdAt: { $gte: rangeStart, $lt: rangeEnd }
  });

  const breakdown: SalesBucket[] = buckets.map((bucket) => {
    const bucketOrders = orders.filter(
      (o) => o.createdAt >= bucket.start && o.createdAt < bucket.end
    );
    const revenue = bucketOrders.reduce(
      (sum, o) => sum + (o.paidAmount || o.totalAmount),
      0
    );
    const items = bucketOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    return { label: bucket.label, date: bucket.date, revenue, orders: bucketOrders.length, items };
  });

  const soldItemMap = new Map<string, SoldItemSummary>();
  for (const order of orders) {
    for (const item of order.items) {
      const productId = String(item.productId);
      const cur = soldItemMap.get(productId) ?? { productId, name: item.name, quantity: 0, revenue: 0 };
      cur.quantity += item.quantity;
      cur.revenue += item.price * item.quantity;
      soldItemMap.set(productId, cur);
    }
  }

  const totalRevenue = breakdown.reduce((sum, b) => sum + b.revenue, 0);
  const totalOrders = breakdown.reduce((sum, b) => sum + b.orders, 0);
  const totalItems = breakdown.reduce((sum, b) => sum + b.items, 0);

  return {
    period,
    label: reportLabel,
    totalRevenue,
    totalOrders,
    totalItems,
    soldItems: Array.from(soldItemMap.values()).sort((a, b) => b.quantity - a.quantity),
    breakdown
  };
}
