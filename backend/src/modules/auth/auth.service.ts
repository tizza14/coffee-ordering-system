import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { UserModel } from '../users/user.model';
import type { LoginInput, RegisterInput } from './auth.validators';

function signAccessToken(user: { id: string; role: string }) {
  const expiresIn = env.jwtExpiresIn as SignOptions['expiresIn'];
  return jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
    expiresIn
  });
}

function toAuthUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export async function register(input: RegisterInput) {
  const existingUser = await UserModel.findOne({ email: input.email });
  if (existingUser) {
    throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    password: passwordHash,
    role: 'user',
    points: 0
  });

  const authUser = toAuthUser(user);
  return {
    user: authUser,
    accessToken: signAccessToken({ id: authUser.id, role: authUser.role })
  };
}

export async function login(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email });
  if (!user) {
    throw new ApiError(
      401,
      'AUTH_INVALID_CREDENTIALS',
      'Invalid email or password'
    );
  }

  const isValidPassword = await bcrypt.compare(input.password, user.password);
  if (!isValidPassword) {
    throw new ApiError(
      401,
      'AUTH_INVALID_CREDENTIALS',
      'Invalid email or password'
    );
  }

  const authUser = toAuthUser(user);
  return {
    user: authUser,
    accessToken: signAccessToken({ id: authUser.id, role: authUser.role })
  };
}
