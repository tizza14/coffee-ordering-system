import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { hashGuestToken, createLookupCode, createGuestToken } from '../../utils/crypto';
import { ProductModel } from '../products/product.model';
import * as pointService from '../points/point.service';
import * as notificationService from '../notifications/notification.service';
import * as socketServer from '../../sockets/socket.server';
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

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

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
  const productById = new Map(products.map((product) => [String(product._id), product]));

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

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { orderItems, totalAmount };
}

export async function createMemberOrder(userId: string, input: CreateOrderInput) {
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

export async function createRedeemOrder(userId: string, input: CreateRedeemOrderInput) {
  const product = await ProductModel.findOne({
    _id: input.productId,
    isAvailable: true,
    isRedeemable: true
  });

  if (!product) {
    throw new ApiError(400, 'PRODUCT_NOT_REDEEMABLE', 'Product is not redeemable');
  }

  const remainingPoints = await pointService.deductPointsForRedemption(userId);
  const order = await OrderModel.create({
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

  await notifyStatusUpdate(order);

  return {
    ...toOrderResponse(order),
    remainingPoints
  };
}

export async function getGuestOrder(lookupCode: string, phone?: string, guestToken?: string) {
  const order = await OrderModel.findOne({ orderLookupCode: lookupCode });
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const phoneMatches = Boolean(phone && order.guestInfo?.phone === phone);
  const tokenMatches = Boolean(guestToken && order.guestTokenHash === hashGuestToken(guestToken));

  if (!phoneMatches && !tokenMatches) {
    throw new ApiError(401, 'GUEST_LOOKUP_INVALID', 'Invalid guest lookup information');
  }

  return toOrderResponse(order);
}

export interface StaffOrdersQuery {
  status?: string;
  paymentStatus?: string;
  page: number;
  limit: number;
}

export async function listStaffOrders(query: StaffOrdersQuery = { page: 1, limit: 20 }) {
  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.paymentStatus = 'paid';
    filter.status = 'pending';
  }
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  const skip = (query.page - 1) * query.limit;
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    OrderModel.countDocuments(filter)
  ]);

  return {
    data: orders.map(toOrderResponse),
    pagination: { page: query.page, limit: query.limit, total }
  };
}

export async function getOrderById(orderId: string, actor: { id: string; role: string }) {
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
  const orders = await OrderModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({
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
    if (!ownsOrder || order.status !== 'pending' || nextStatus !== 'cancelled') {
      throw new ApiError(403, 'ORDER_ACCESS_DENIED', 'Cannot update this order');
    }

    order.status = nextStatus;
    await order.save();
    await returnRedeemedPointsIfCancelled(order);
    
    await notifyStatusUpdate(order);
    
    return toOrderResponse(order);
  }

  if (!allowedTransitions[order.status].includes(nextStatus)) {
    throw new ApiError(400, 'INVALID_STATUS_TRANSITION', 'Invalid order status transition');
  }

  if (order.status === 'pending' && nextStatus === 'accepted' && order.paymentStatus !== 'paid') {
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
    await pointService.returnPoints(String(order.userId), order.pointsRedeemed);
    const originalPointsRedeemed = order.pointsRedeemed;
    order.pointsRedeemed = 0;
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
}
