<template>
  <header
    class="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-stone-300 bg-white px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6"
  >
    <RouterLink
      class="shrink-0 rounded-md px-2 py-1 font-bold text-slate-800 no-underline transition-colors hover:bg-stone-100"
      to="/products"
    >
      Coffee Ordering
    </RouterLink>
    <nav
      class="flex w-full items-center gap-3.5 overflow-x-auto pb-1 sm:w-auto sm:justify-end sm:overflow-visible sm:pb-0"
    >
      <RouterLink
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/products"
      >
        Products
      </RouterLink>
      <RouterLink
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/checkout"
      >
        Checkout
      </RouterLink>
      <RouterLink
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/orders/guest"
      >
        Track
      </RouterLink>
      <RouterLink
        v-if="authStore.isAuthenticated"
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/orders/my"
      >
        My Orders
      </RouterLink>
      <RouterLink
        v-if="
          authStore.user?.role === 'staff' || authStore.user?.role === 'admin'
        "
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/staff/orders"
      >
        Staff
      </RouterLink>
      <RouterLink
        v-if="authStore.user?.role === 'admin'"
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/admin/products"
      >
        Products
      </RouterLink>
      <RouterLink
        v-if="authStore.user?.role === 'admin'"
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/admin/users"
      >
        Users
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/login"
      >
        Login
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        to="/register"
      >
        Register
      </RouterLink>
      <button
        v-if="authStore.isAuthenticated"
        class="min-h-9 shrink-0 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800 transition-colors hover:border-slate-800 hover:bg-stone-100"
        type="button"
        @click="authStore.logout()"
      >
        Logout
      </button>
    </nav>
  </header>
  <main class="min-h-screen">
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth.store';

const authStore = useAuthStore();
const navLinkClass =
  'inline-flex min-h-9 shrink-0 items-center rounded-md border border-transparent px-3 font-bold text-slate-800 no-underline transition-colors hover:border-stone-300 hover:bg-stone-100';
const navActiveClass =
  'border-slate-800 bg-slate-800 text-white hover:border-slate-700 hover:bg-slate-700';
</script>
