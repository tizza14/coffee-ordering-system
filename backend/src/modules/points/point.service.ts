import { UserModel } from '../users/user.model';
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
