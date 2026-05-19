<template>
  <header class="sticky top-0 z-40 border-b border-stone-300 bg-white">
    <div class="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
    <RouterLink
      class="shrink-0 rounded-md px-2 py-1 font-bold text-amber-950 no-underline transition-colors hover:bg-amber-50"
      to="/products"
      @click="closeMobileMenu"
    >
      咖啡點餐系統
    </RouterLink>

    <nav class="hidden items-center gap-3.5 md:flex">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.to"
        :class="navLinkClass"
        :exact-active-class="navActiveClass"
        :to="item.to"
      >
        {{ item.label }}
        <span
          v-if="item.showPoints"
          class="ml-1 rounded-full bg-amber-900 px-1.5 py-0.5 text-xs font-bold text-white"
        >{{ authStore.user?.points }}</span>
      </RouterLink>
      <button
        v-if="authStore.isAuthenticated"
        class="min-h-9 shrink-0 rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950 transition-colors hover:border-amber-900 hover:bg-amber-50"
        type="button"
        @click="handleLogout"
      >
        登出
      </button>
    </nav>

    <button
      class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-400 bg-white text-amber-950 transition-colors hover:border-amber-900 hover:bg-amber-50 md:hidden"
      type="button"
      :aria-expanded="isMobileMenuOpen"
      aria-controls="mobile-navigation"
      aria-label="開啟選單"
      @click="isMobileMenuOpen = true"
    >
      <span class="block h-0.5 w-5 rounded bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
    </button>
    </div>
  </header>

  <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 md:hidden">
    <button
      class="absolute inset-0 h-full w-full bg-stone-950/40"
      type="button"
      aria-label="關閉選單"
      @click="closeMobileMenu"
    />
    <aside
      class="absolute right-0 top-0 flex h-dvh w-[min(84vw,320px)] flex-col bg-white p-4 shadow-2xl"
      aria-label="手機導覽選單"
    >
      <div class="mb-4 flex items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <span class="font-bold text-amber-950">選單</span>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 text-xl leading-none text-amber-950 hover:border-amber-900 hover:bg-amber-50"
          type="button"
          aria-label="關閉選單"
          @click="closeMobileMenu"
        >
          ×
        </button>
      </div>
      <nav id="mobile-navigation" class="flex flex-col gap-2">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.to"
          :class="mobileNavLinkClass"
          :exact-active-class="mobileNavActiveClass"
          :to="item.to"
          @click="closeMobileMenu"
        >
          {{ item.label }}
          <span
            v-if="item.showPoints"
            class="ml-auto rounded-full bg-amber-900 px-2 py-0.5 text-xs font-bold text-white"
          >{{ authStore.user?.points }}</span>
        </RouterLink>
        <button
          v-if="authStore.isAuthenticated"
          class="mt-2 min-h-11 rounded-md border border-stone-500 bg-white px-3 text-left font-bold text-amber-950 transition-colors hover:border-amber-900 hover:bg-amber-50"
          type="button"
          @click="handleLogout"
        >
          登出
        </button>
      </nav>
    </aside>
  </div>

  <main class="min-h-screen">
    <RouterView />
  </main>
  <ToastContainer />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth.store';
import ToastContainer from './components/ToastContainer.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const isMobileMenuOpen = ref(false);
const navLinkClass =
  'inline-flex min-h-9 shrink-0 items-center rounded-md border border-transparent px-3 font-bold text-amber-950 no-underline transition-colors hover:border-stone-300 hover:bg-amber-50';
const navActiveClass =
  'border-amber-900 bg-amber-900 text-white hover:border-amber-800 hover:bg-amber-800';
const mobileNavLinkClass =
  'flex min-h-11 items-center rounded-md border border-transparent px-3 font-bold text-amber-950 no-underline transition-colors hover:border-stone-300 hover:bg-amber-50';
const mobileNavActiveClass =
  'border-amber-900 bg-amber-900 text-white hover:border-amber-800 hover:bg-amber-800';

const visibleNavItems = computed(() => {
  const role = authStore.user?.role;
  const isStaffRole = role === 'staff' || role === 'admin';
  const points = authStore.user?.points ?? 0;

  return [
    { label: '商品', to: '/products', visible: true },
    { label: '結帳', to: '/checkout', visible: true },
    { label: '訂單追蹤', to: '/orders/guest', visible: true },
    {
      label: '點餐紀錄',
      to: '/orders/my',
      visible: authStore.isAuthenticated,
    },
    {
      label: '我的點數',
      to: '/points',
      visible: role === 'user',
      showPoints: points > 0,
    },
    { label: '員工訂單', to: '/staff/orders', visible: isStaffRole },
    { label: '銷售報表', to: '/staff/sales', visible: isStaffRole },
    { label: '商品管理', to: '/admin/products', visible: role === 'admin' },
    { label: '使用者管理', to: '/admin/users', visible: role === 'admin' },
    { label: '登入', to: '/login', visible: !authStore.isAuthenticated },
    { label: '註冊', to: '/register', visible: !authStore.isAuthenticated },
  ].filter((item) => item.visible);
});

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function handleLogout() {
  closeMobileMenu();
  authStore.logout();
  void router.push('/login');
}

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu();
  }
);
</script>
