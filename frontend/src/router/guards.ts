export type RouteRole = 'guest' | 'user' | 'staff' | 'admin';
export type AuthenticatedRouteRole = Exclude<RouteRole, 'guest'>;

export function canAccessRoute(
  allowedRoles: RouteRole[],
  currentRole: RouteRole
) {
  return allowedRoles.includes(currentRole);
}

export function getCurrentRouteRole(userRole?: RouteRole) {
  return userRole ?? 'guest';
}

export function getDefaultRouteForRole(role?: RouteRole) {
  if (role === 'staff' || role === 'admin') return '/staff/orders';
  return '/products';
}

export function isStaffOnlyRole(role?: RouteRole) {
  return role === 'staff';
}
