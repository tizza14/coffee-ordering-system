import mongoose from 'mongoose';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { hashGuestToken } from '../../utils/crypto';
import { OrderModel, type OrderDocument } from '../orders/order.model';
import * as notificationService from '../notifications/notification.service';
import * as pointService from '../points/point.service';
import * as socketServer from '../../sockets/socket.server';
import * as linePayClient from './linePay.client';
import { PaymentModel, type PaymentDocument } from './payment.model';

interface PaymentActor {
  user?: { id: string; role: string };
  guestToken?: string;
}

function toPaymentResponse(payment: PaymentDocument) {
  return {
    id: String(payment._id),
    orderId: String(payment.orderId),
    transactionId: payment.transactionId,
    merchantOrderId: payment.merchantOrderId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status
  };
}

function assertCanAccessOrder(order: OrderDocument, actor: PaymentActor) {
  if (actor.user && order.userId && String(order.userId) === actor.user.id) {
    return;
  }

  if (
    actor.guestToken &&
    order.guestTokenHash &&
    order.guestTokenHash === hashGuestToken(actor.guestToken)
  ) {
    return;
  }

  throw new ApiError(403, 'ORDER_ACCESS_DENIED', 'Cannot access this order');
}

function createMerchantOrderId(orderId: string) {
  return `LP-${orderId}-${Date.now()}`;
}

function createMockTransactionId(orderId: string) {
  return `MOCK-${orderId}-${Date.now()}`;
}

function createMockPaymentUrl(
  order: OrderDocument,
  transactionId: string,
  _actor: PaymentActor
) {
  const url = new URL(env.linePayConfirmUrl);
  url.searchParams.set('orderId', String(order._id));
  url.searchParams.set('transactionId', transactionId);
  if (order.orderLookupCode) {
    url.searchParams.set('lookupCode', order.orderLookupCode);
  }
  // Do NOT pass raw guestToken in URL — frontend reads it from orderStore.guestToken
  return url.toString();
}

function createMockRequestResult(
  order: OrderDocument,
  actor: PaymentActor,
  error?: unknown
) {
  const transactionId = createMockTransactionId(String(order._id));
  return {
    transactionId,
    paymentUrl: createMockPaymentUrl(order, transactionId, actor),
    rawResponse: {
      provider: 'mock_line_pay',
      fallbackReason: error instanceof Error ? error.message : undefined
    }
  };
}

function hasUsableLinePayRequestResult(result: {
  transactionId: string;
  paymentUrl: string;
}) {
  return Boolean(result.transactionId && result.paymentUrl);
}

async function findOrderForPayment(orderId: string, actor: PaymentActor) {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  assertCanAccessOrder(order, actor);
  return order;
}

export async function requestLinePay(orderId: string, actor: PaymentActor) {
  const order = await findOrderForPayment(orderId, actor);

  if (order.orderType !== 'purchase') {
    throw new ApiError(
      400,
      'PAYMENT_REQUEST_NOT_ALLOWED',
      'Redeem orders do not use Line Pay'
    );
  }

  if (!['unpaid', 'payment_failed'].includes(order.paymentStatus)) {
    throw new ApiError(
      400,
      'PAYMENT_REQUEST_NOT_ALLOWED',
      'Order cannot start payment'
    );
  }

  const merchantOrderId = createMerchantOrderId(String(order._id));
  const payload = {
    amount: order.totalAmount,
    currency: 'TWD' as const,
    orderId: merchantOrderId,
    packages: [
      {
        id: String(order._id),
        amount: order.totalAmount,
        products: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      }
    ],
    redirectUrls: {
      confirmUrl: env.linePayConfirmUrl,
      cancelUrl: env.linePayCancelUrl
    }
  };
  const linePayResult = env.linePayMock
    ? createMockRequestResult(order, actor)
    : await linePayClient
        .requestPayment(payload)
        .then((result) =>
          hasUsableLinePayRequestResult(result)
            ? result
            : createMockRequestResult(
                order,
                actor,
                new Error('Line Pay response missing transactionId or paymentUrl')
              )
        )
        .catch((error) =>
          env.nodeEnv === 'test'
            ? Promise.reject(error)
            : createMockRequestResult(order, actor, error)
        );

  const payment = await PaymentModel.create({
    orderId: order._id,
    provider: 'line_pay',
    transactionId: linePayResult.transactionId,
    merchantOrderId,
    amount: order.totalAmount,
    currency: 'TWD',
    status: 'payment_pending',
    rawRequest: payload,
    rawResponse: linePayResult.rawResponse
  });

  order.paymentStatus = 'payment_pending';
  order.linePayTransactionId = linePayResult.transactionId;
  order.linePayOrderId = merchantOrderId;
  await order.save();

  return {
    paymentUrl: linePayResult.paymentUrl,
    transactionId: linePayResult.transactionId,
    paymentStatus: order.paymentStatus,
    payment: toPaymentResponse(payment)
  };
}

export async function confirmLinePay(
  orderId: string,
  transactionId: string,
  actor: PaymentActor
) {
  const order = await findOrderForPayment(orderId, actor);

  if (order.linePayTransactionId !== transactionId) {
    throw new ApiError(
      403,
      'ORDER_ACCESS_DENIED',
      'Transaction does not belong to this order'
    );
  }

  const payment = await PaymentModel.findOne({
    orderId: new mongoose.Types.ObjectId(orderId),
    transactionId
  });

  if (!payment) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Payment not found');
  }

  if (order.paymentStatus === 'paid' || payment.status === 'paid') {
    return {
      orderId: String(order._id),
      transactionId,
      paymentStatus: 'paid',
      paidAmount: order.paidAmount,
      pointsEarned: order.pointsEarned,
      payment: toPaymentResponse(payment)
    };
  }

  const shouldUseMockConfirm =
    env.linePayMock || transactionId.startsWith('MOCK-');
  const linePayResult = shouldUseMockConfirm
    ? {
        transactionId,
        amount: order.totalAmount,
        currency: 'TWD',
        rawResponse: { provider: 'mock_line_pay' }
      }
    : await linePayClient
        .confirmPayment(transactionId, order.totalAmount, 'TWD')
        .catch((error) =>
          env.nodeEnv === 'test'
            ? Promise.reject(error)
            : {
                transactionId,
                amount: order.totalAmount,
                currency: 'TWD',
                rawResponse: {
                  provider: 'mock_line_pay',
                  fallbackReason:
                    error instanceof Error ? error.message : undefined
                }
              }
        );
  payment.rawResponse = linePayResult.rawResponse;

  if (linePayResult.amount !== order.totalAmount) {
    payment.status = 'payment_failed';
    await payment.save();
    throw new ApiError(
      409,
      'PAYMENT_AMOUNT_MISMATCH',
      'Payment amount mismatch'
    );
  }

  payment.status = 'paid';
  payment.confirmedAt = new Date();
  await payment.save();

  const pointsEarned =
    order.userId && order.orderType === 'purchase'
      ? pointService.calculateEarnedPoints(order.totalAmount)
      : 0;

  order.paymentStatus = 'paid';
  order.paidAmount = linePayResult.amount;
  order.pointsEarned = pointsEarned;
  await order.save();

  if (order.userId && pointsEarned > 0) {
    await pointService.earnPoints(String(order.userId), pointsEarned);
  }

  const message = `Payment confirmed for order ${order._id}`;
  const notification = await notificationService.createNotification({
    userId: order.userId ? String(order.userId) : undefined,
    guestOrderLookupCode: order.orderLookupCode || undefined,
    orderId: String(order._id),
    audience: order.userId ? 'user' : 'guest',
    type: 'order_paid',
    message
  });

  socketServer.emitOrderUpdated(String(order._id), {
    status: order.status,
    updatedAt: order.updatedAt
  });
  socketServer.emitNotification(`room:order:${order._id}`, notification);
  if (order.userId) {
    socketServer.emitNotification(`room:user:${order.userId}`, notification);
  }
  socketServer.emitNotification('room:staff', {
    type: 'order_paid',
    orderId: String(order._id),
    totalAmount: order.totalAmount,
    message
  });

  return {
    orderId: String(order._id),
    transactionId,
    paymentStatus: order.paymentStatus,
    paidAmount: order.paidAmount,
    pointsEarned: order.pointsEarned,
    payment: toPaymentResponse(payment)
  };
}

export async function cancelLinePay(orderId: string, actor: PaymentActor) {
  const order = await findOrderForPayment(orderId, actor);

  if (order.paymentStatus === 'paid') {
    throw new ApiError(
      400,
      'PAYMENT_REQUEST_NOT_ALLOWED',
      'Order is already paid'
    );
  }

  if (['payment_pending', 'unpaid'].includes(order.paymentStatus)) {
    order.paymentStatus = 'payment_failed';
    await order.save();
  }

  return { orderId: String(order._id), paymentStatus: order.paymentStatus };
}
