import { describe, expect, it } from 'vitest';
import {
  canAccessRoute,
  getCurrentRouteRole,
  getDefaultRouteForRole,
  isStaffOnlyRole
} from './guards';

describe('route guards', () => {
  it('allows matching roles and rejects others', () => {
    expect(canAccessRoute(['guest', 'user'], 'guest')).toBe(true);
    expect(canAccessRoute(['admin'], 'user')).toBe(false);
    expect(canAccessRoute(['staff', 'admin'], 'staff')).toBe(true);
  });

  it('uses guest role when there is no signed-in user', () => {
    expect(getCurrentRouteRole()).toBe('guest');
    expect(getCurrentRouteRole('admin')).toBe('admin');
  });

  it('returns the correct default entry for each role', () => {
    expect(getDefaultRouteForRole()).toBe('/products');
    expect(getDefaultRouteForRole('guest')).toBe('/products');
    expect(getDefaultRouteForRole('user')).toBe('/products');
    expect(getDefaultRouteForRole('admin')).toBe('/staff/orders');
    expect(getDefaultRouteForRole('staff')).toBe('/staff/orders');
  });

  it('treats staff as the only role restricted to staff routes', () => {
    expect(isStaffOnlyRole('staff')).toBe(true);
    expect(isStaffOnlyRole('admin')).toBe(false);
    expect(isStaffOnlyRole('user')).toBe(false);
    expect(isStaffOnlyRole()).toBe(false);
  });
});
