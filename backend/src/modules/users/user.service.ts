import { ApiError } from '../../utils/ApiError';
import { UserModel } from './user.model';
import type { UpdateRoleInput } from './user.validators';

export interface UserListQuery {
  page: number;
  limit: number;
}

function toUserResponse(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  points: number;
  createdAt?: unknown;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    points: user.points,
    createdAt: user.createdAt
  };
}

export async function listUsers(query: UserListQuery) {
  const skip = (query.page - 1) * query.limit;
  const [users, total] = await Promise.all([
    UserModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    UserModel.countDocuments({})
  ]);

  return {
    data: users.map(toUserResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total
    }
  };
}

export async function updateUserRole(id: string, input: UpdateRoleInput) {
  const user = await UserModel.findByIdAndUpdate(
    id,
    { role: input.role },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found');
  }

  return toUserResponse(user);
}
