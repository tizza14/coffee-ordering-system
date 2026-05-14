export type RouteRole = 'guest' | 'user' | 'staff' | 'admin';

export function canAccessRoute(allowedRoles: RouteRole[], currentRole: RouteRole) {
  return allowedRoles.includes(currentRole);
}

export function getCurrentRouteRole(userRole?: RouteRole) {
  return userRole ?? 'guest';
}
