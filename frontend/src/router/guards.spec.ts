import { describe, expect, it } from 'vitest';
import { canAccessRoute, getCurrentRouteRole } from './guards';

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
});
