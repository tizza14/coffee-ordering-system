import { UserModel } from '../users/user.model';
import { OrderModel } from '../orders/order.model';
import { ApiError } from '../../utils/ApiError';

export const REDEEM_POINTS_COST = 3;

/**
 * Calculate earned points based on paid amount.
 * Rule: 1 point per $100.
 */
export function calculateEarnedPoints(amount: number): number {
  return Math.floor(amount / 100);
}

/**
 * Add points to a user.
 */
export async function earnPoints(userId: string, points: number) {
  if (points <= 0) return;
  await UserModel.findByIdAndUpdate(userId, { $inc: { points } });
}

/**
 * Deduct points from a user for redemption.
 * Throws error if points are insufficient.
 */
export async function deductPointsForRedemption(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found');
  }

  if (user.points < REDEEM_POINTS_COST) {
    throw new ApiError(400, 'POINTS_NOT_ENOUGH', 'Insufficient points');
  }

  // Atomic update with condition to prevent race conditions
  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: user._id, points: { $gte: REDEEM_POINTS_COST } },
    { $inc: { points: -REDEEM_POINTS_COST } },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(400, 'POINTS_NOT_ENOUGH', 'Insufficient points');
  }

  return updatedUser.points;
}

/**
 * Return points to a user (e.g. on cancellation).
 */
export async function returnPoints(userId: string, points: number) {
  if (points <= 0) return;
  await UserModel.findByIdAndUpdate(userId, { $inc: { points } });
}

export interface PointHistoryEntry {
  orderId: string;
  orderLookupCode: string | null;
  orderType: 'purchase' | 'redeem';
  delta: number;
  createdAt: string;
}

/**
 * Return point transaction history for a user derived from orders.
 */
export async function getPointHistory(userId: string): Promise<PointHistoryEntry[]> {
  const orders = await OrderModel.find({
    userId,
    $or: [{ pointsEarned: { $gt: 0 } }, { pointsRedeemed: { $gt: 0 } }]
  })
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((o) => ({
    orderId: String(o._id),
    orderLookupCode: o.orderLookupCode ?? null,
    orderType: o.orderType as 'purchase' | 'redeem',
    delta: o.orderType === 'redeem' ? -(o.pointsRedeemed ?? 0) : (o.pointsEarned ?? 0),
    createdAt: (o.createdAt as Date).toISOString()
  }));
}
