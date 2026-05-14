<template>
  <header class="flex min-h-16 items-center justify-between gap-6 border-b border-stone-300 bg-white px-6">
    <RouterLink
      class="font-bold text-slate-800 no-underline"
      to="/products"
    >
      Coffee Ordering
    </RouterLink>
    <nav class="flex items-center gap-3.5">
      <RouterLink
        class="font-bold text-slate-800 no-underline"
        to="/products"
      >
        Products
      </RouterLink>
      <RouterLink
        class="font-bold text-slate-800 no-underline"
        to="/checkout"
      >
        Checkout
      </RouterLink>
      <RouterLink
        class="font-bold text-slate-800 no-underline"
        to="/orders/guest"
      >
        Track
      </RouterLink>
      <RouterLink
        v-if="authStore.isAuthenticated"
        class="font-bold text-slate-800 no-underline"
        to="/orders/my"
      >
        My Orders
      </RouterLink>
      <RouterLink
        v-if="authStore.user?.role === 'staff' || authStore.user?.role === 'admin'"
        class="font-bold text-slate-800 no-underline"
        to="/staff/orders"
      >
        Staff
      </RouterLink>
      <RouterLink
        v-if="authStore.user?.role === 'admin'"
        class="font-bold text-slate-800 no-underline"
        to="/admin/products"
      >
        Products
      </RouterLink>
      <RouterLink
        v-if="authStore.user?.role === 'admin'"
        class="font-bold text-slate-800 no-underline"
        to="/admin/users"
      >
        Users
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="font-bold text-slate-800 no-underline"
        to="/login"
      >
        Login
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="font-bold text-slate-800 no-underline"
        to="/register"
      >
        Register
      </RouterLink>
      <button
        v-if="authStore.isAuthenticated"
        class="min-h-8 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800"
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
</script>
