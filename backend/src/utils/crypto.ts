import crypto from 'crypto';

export function hashGuestToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createLookupCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function createGuestToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function createRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}
