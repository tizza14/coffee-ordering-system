<template>
  <section class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6">
    <header>
      <h1 class="m-0 text-2xl font-bold text-amber-950">我的點數</h1>
      <p class="m-0 text-stone-600">消費每滿 NT$100 獲得 1 點，累積 3 點可免費兌換指定商品。</p>
    </header>

    <!-- 點數餘額卡 -->
    <article class="rounded-lg border border-amber-300 bg-amber-900 p-6 text-white">
      <p class="m-0 text-sm font-bold uppercase tracking-widest opacity-70">目前點數</p>
      <div class="mt-2 flex items-end gap-3">
        <span class="text-6xl font-extrabold leading-none">{{ points }}</span>
        <span class="mb-1 text-lg opacity-80">點</span>
      </div>
      <p class="m-0 mt-3 text-sm opacity-70">
        {{ points >= REDEEM_COST ? `還差 0 點即可兌換` : `還差 ${REDEEM_COST - points} 點可兌換` }}
      </p>
      <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-800">
        <div
          class="h-full rounded-full bg-white transition-all"
          :style="{ width: `${Math.min((points / REDEEM_COST) * 100, 100)}%` }"
        ></div>
      </div>
    </article>

    <section
      v-if="lastRedeemOrder"
      class="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
    >
      <div>
        <p class="m-0 text-sm font-extrabold text-emerald-700">兌換成功</p>
        <h2 class="m-0 mt-1 text-xl font-bold text-amber-950">
          已建立兌換訂單 {{ lastRedeemOrder.orderLookupCode || lastRedeemOrder.id.slice(-6) }}
        </h2>
      </div>
      <div class="grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
        <p class="m-0 rounded-md bg-white p-3">
          <span class="block text-xs font-bold text-stone-500">點數去向</span>
          <strong class="text-red-600">已扣 {{ lastRedeemOrder.pointsRedeemed }} 點</strong>
        </p>
        <p class="m-0 rounded-md bg-white p-3">
          <span class="block text-xs font-bold text-stone-500">剩餘點數</span>
          <strong class="text-amber-950">{{ points }} 點</strong>
        </p>
        <p class="m-0 rounded-md bg-white p-3">
          <span class="block text-xs font-bold text-stone-500">後續流程</span>
          <strong class="text-amber-950">等待店員接單製作</strong>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <RouterLink
          class="inline-flex min-h-10 items-center rounded-md bg-amber-900 px-4 text-sm font-bold text-white no-underline"
          to="/orders/my"
        >
          查看兌換訂單狀態
        </RouterLink>
        <span class="text-sm text-stone-600">兌換品項會出現在點餐紀錄，可追蹤待處理、製作中與可取餐狀態。</span>
      </div>
    </section>

    <!-- 兌換商品 -->
    <section>
      <h2 class="m-0 mb-3 text-lg font-bold text-amber-950">可兌換商品</h2>

      <div v-if="isLoadingProducts" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="i in 3"
          :key="i"
          class="animate-pulse rounded-lg border border-stone-200 bg-white p-4"
        >
          <div class="mb-3 h-4 w-28 rounded bg-stone-200"></div>
          <div class="h-3 w-20 rounded bg-stone-200"></div>
        </div>
      </div>

      <p v-else-if="redeemableProducts.length === 0" class="text-stone-500">
        目前沒有可兌換的商品。
      </p>

      <ul v-else class="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="product in redeemableProducts"
          :key="product.id"
          class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
        >
          <div>
            <h3 class="m-0 font-bold text-amber-950">{{ product.name }}</h3>
            <p class="m-0 text-sm text-stone-500">{{ product.description }}</p>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">
              {{ product.redeemPoints }} 點兌換
            </span>
            <button
              class="min-h-9 rounded-md bg-amber-900 px-4 text-sm font-bold text-white disabled:opacity-40"
              type="button"
              :disabled="points < REDEEM_COST || isRedeeming === product.id"
              @click="redeem(product.id, product.name)"
            >
              {{ isRedeeming === product.id ? '兌換中...' : '立即兌換' }}
            </button>
          </div>
          <p
            v-if="points < REDEEM_COST"
            class="m-0 text-xs font-semibold text-stone-500"
          >
            還差 {{ REDEEM_COST - points }} 點可兌換。
          </p>
        </li>
      </ul>
    </section>

    <!-- 點數紀錄 -->
    <section v-if="pointHistory.length > 0">
      <h2 class="m-0 mb-3 text-lg font-bold text-amber-950">點數紀錄</h2>
      <ul class="grid list-none gap-2 p-0">
        <li
          v-for="record in pointHistory"
          :key="record.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3"
        >
          <div class="grid gap-0.5">
            <span class="text-sm font-bold text-amber-950">{{ record.label }}</span>
            <span class="text-xs text-stone-400">{{ formatDate(record.createdAt) }}</span>
          </div>
          <span
            class="text-base font-extrabold"
            :class="record.delta > 0 ? 'text-emerald-700' : 'text-red-600'"
          >
            {{ record.delta > 0 ? '+' : '' }}{{ record.delta }} 點
          </span>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useOrderStore } from '../../stores/order.store';
import { useToastStore } from '../../stores/toast.store';
import { useConfirmStore } from '../../stores/confirm.store';
import { extractApiError } from '../../api/http';
import * as productApi from '../../api/product.api';
import * as orderApi from '../../api/order.api';

const REDEEM_COST = 3;

const authStore = useAuthStore();
const orderStore = useOrderStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();

const points = computed(() => authStore.user?.points ?? 0);
const isLoadingProducts = ref(false);
const redeemableProducts = ref<productApi.Product[]>([]);
const isRedeeming = ref('');
const lastRedeemOrder = ref<orderApi.Order | null>(null);

interface PointRecord {
  id: string;
  label: string;
  delta: number;
  createdAt: string;
}

const pointHistory = computed<PointRecord[]>(() => {
  return orderStore.myOrders
    .filter((o) => o.pointsEarned > 0 || o.pointsRedeemed > 0)
    .map((o) => ({
      id: o.id,
      label:
        o.orderType === 'redeem'
          ? `兌換訂單 ${o.orderLookupCode ?? o.id.slice(-6)}`
          : `訂單 ${o.orderLookupCode ?? o.id.slice(-6)} 獲得點數`,
      delta: o.orderType === 'redeem' ? -o.pointsRedeemed : o.pointsEarned,
      createdAt: o.createdAt
    }));
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

async function redeem(productId: string, productName: string) {
  const confirmed = await confirmStore.confirm({
    title: '確認兌換',
    message: `消耗 ${REDEEM_COST} 點兌換「${productName}」？`,
    confirmLabel: '確認兌換',
    cancelLabel: '取消'
  });
  if (!confirmed) return;

  isRedeeming.value = productId;
  try {
    const redeemOrder = await orderApi.createRedeemOrder(productId);
    lastRedeemOrder.value = redeemOrder;
    await authStore.refreshUser();
    await orderStore.loadMyOrders();
    toastStore.success(`兌換成功！剩餘 ${authStore.user?.points ?? 0} 點`);
  } catch (err) {
    toastStore.error(extractApiError(err) || '兌換失敗，請稍後再試。');
  } finally {
    isRedeeming.value = '';
  }
}

onMounted(async () => {
  await authStore.refreshUser();

  isLoadingProducts.value = true;
  try {
    const result = await productApi.getProducts({ available: true });
    redeemableProducts.value = result.data.filter((p) => p.isRedeemable);
  } finally {
    isLoadingProducts.value = false;
  }

  await orderStore.loadMyOrders();
});
</script>
