import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import LoginView from '../views/auth/LoginView.vue';
import AdminProductsView from '../views/admin/AdminProductsView.vue';
import AdminUsersView from '../views/admin/AdminUsersView.vue';
import RegisterView from '../views/auth/RegisterView.vue';
import GuestOrderTrackingView from '../views/orders/GuestOrderTrackingView.vue';
import MyOrdersView from '../views/orders/MyOrdersView.vue';
import PointsView from '../views/orders/PointsView.vue';
import LinePayConfirmView from '../views/payments/LinePayConfirmView.vue';
import StaffOrdersView from '../views/staff/StaffOrdersView.vue';
import SalesReportView from '../views/staff/SalesReportView.vue';
import CheckoutView from '../views/shop/CheckoutView.vue';
import ProductListView from '../views/shop/ProductListView.vue';
import { canAccessRoute, getCurrentRouteRole, type RouteRole } from './guards';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/products'
    },
    {
      path: '/products',
      component: ProductListView
    },
    {
      path: '/checkout',
      component: CheckoutView
    },
    {
      path: '/orders/my',
      component: MyOrdersView,
      meta: { roles: ['user', 'staff', 'admin'] }
    },
    {
      path: '/points',
      component: PointsView,
      meta: { roles: ['user'] }
    },
    {
      path: '/orders/guest',
      component: GuestOrderTrackingView
    },
    {
      path: '/staff/orders',
      component: StaffOrdersView,
      meta: { roles: ['staff', 'admin'] }
    },
    {
      path: '/staff/sales',
      component: SalesReportView,
      meta: { roles: ['staff', 'admin'] }
    },
    {
      path: '/admin/products',
      component: AdminProductsView,
      meta: { roles: ['admin'] }
    },
    {
      path: '/admin/users',
      component: AdminUsersView,
      meta: { roles: ['admin'] }
    },
    {
      path: '/payments/line-pay/confirm',
      component: LinePayConfirmView
    },
    {
      path: '/login',
      component: LoginView
    },
    {
      path: '/register',
      component: RegisterView
    }
  ]
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (authStore.isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    return '/products';
  }

  const allowedRoles = to.meta.roles as RouteRole[] | undefined;
  if (!allowedRoles) return true;

  const currentRole = getCurrentRouteRole(authStore.user?.role);
  if (canAccessRoute(allowedRoles, currentRole)) return true;

  return authStore.isAuthenticated ? '/products' : '/login';
});
