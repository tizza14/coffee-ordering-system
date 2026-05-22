<template>
  <section class="grid min-h-[calc(100vh-64px)] gap-5 bg-amber-50 p-4 sm:p-6">
    <header class="flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch">
      <div>
        <p class="m-0 text-xs font-extrabold uppercase tracking-wide text-amber-700">Order Queue</p>
        <h1 class="m-0 text-2xl font-bold text-amber-950">員工訂單</h1>
        <p class="m-0 text-stone-600">依處理優先順序查看已付款訂單，快速推進狀態。</p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-amber-950"
        type="button"
        @click="loadDashboard"
      >
        重新整理
      </button>
    </header>

    <section v-if="orderStore.todaySummary" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="rounded-lg border border-stone-300 bg-white p-4"
      >
        <p class="m-0 text-sm font-bold uppercase text-stone-500">{{ metric.label }}</p>
        <strong class="text-2xl text-amber-950">{{ metric.value }}</strong>
        <p v-if="metric.note" class="m-0 text-sm text-stone-600">{{ metric.note }}</p>
      </article>
    </section>

    <section v-if="orderStore.todaySummary" class="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="m-0 text-lg font-bold text-amber-950">目前佇列</h2>
          <strong class="text-sm text-amber-900">{{ activeOrders.length }} 筆進行中</strong>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-4">
          <div
            v-for="status in queueStatuses"
            :key="status"
            class="rounded-md border border-stone-200 bg-amber-50 p-3"
          >
            <p class="m-0 text-xs font-bold text-stone-500">{{ statusLabel(status) }}</p>
            <strong class="text-xl text-amber-950">
              {{ orderStore.todaySummary.statusCounts[status] }}
            </strong>
          </div>
        </div>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="m-0 text-lg font-bold text-amber-950">今日銷售品項</h2>
          <span class="text-sm font-bold text-stone-500">
            已售 {{ orderStore.todaySummary.itemQuantity }} 件
          </span>
        </div>
        <p v-if="soldItems.length === 0" class="m-0 pt-3 text-stone-600">尚無已付款品項。</p>
        <ul v-else class="grid max-h-36 list-none gap-2 overflow-auto p-0">
          <li
            v-for="item in soldItems"
            :key="item.productId"
            class="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-stone-200 pt-2 text-amber-950"
          >
            <strong>{{ item.name }}</strong>
            <span class="font-bold">x {{ item.quantity }}</span>
            <span>NT$ {{ item.revenue }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2" aria-label="訂單佇列篩選">
        <button
          v-for="filter in queueFilters"
          :key="filter.value"
          type="button"
          :class="filterButtonClass(filter.value)"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
          <span class="rounded-full bg-white/70 px-2 py-0.5 text-xs">{{ filterCount(filter.value) }}</span>
        </button>
      </div>
      <p class="m-0 text-sm font-bold text-stone-500">
        {{ queueHint }}
      </p>
    </section>

    <template v-if="isLoading">
      <ul class="grid list-none gap-3 p-0">
        <li
          v-for="i in 3"
          :key="i"
          class="animate-pulse grid gap-3 rounded-lg border border-stone-200 bg-white p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-2">
              <div class="h-5 w-36 rounded bg-stone-200"></div>
              <div class="h-3 w-24 rounded bg-stone-200"></div>
            </div>
            <div class="h-6 w-20 rounded-full bg-stone-200"></div>
          </div>
          <div class="h-3 w-full rounded bg-stone-200"></div>
          <div class="h-10 w-full rounded bg-stone-200"></div>
        </li>
      </ul>
    </template>
    <p
      v-else-if="errorMessage"
      class="m-0 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="orderedStaffOrders.length === 0"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4 text-stone-600"
    >
      目前沒有已付款待處理訂單。
    </p>
    <p
      v-else-if="filteredOrders.length === 0"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4 text-stone-600"
    >
      這個佇列目前沒有訂單。
    </p>

    <ul v-else class="grid list-none gap-3 p-0">
      <li
        v-for="order in filteredOrders"
        :key="order.id"
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-4 max-[760px]:flex-col">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="m-0 text-xl font-bold text-amber-950">
                訂單 {{ order.orderLookupCode || '未產生查詢碼' }}
              </h2>
              <span :class="statusBadgeClass(order.status)">
                {{ statusLabel(order.status) }}
              </span>
            </div>
            <p class="m-0 text-stone-600">
              {{ customerLabel(order) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span :class="paymentBadgeClass(order.paymentStatus)">
              {{ paymentStatusLabel(order.paymentStatus) }}
            </span>
            <span
              v-if="order.orderType === 'redeem'"
              class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800"
            >
              點數兌換
            </span>
          </div>
        </div>

        <ul class="grid list-none gap-1 p-0 text-amber-900">
          <li
            v-for="item in order.items"
            :key="item.productId"
            class="flex justify-between gap-3"
          >
            <span>{{ item.name }} x {{ item.quantity }}</span>
            <strong>NT$ {{ item.price * item.quantity }}</strong>
          </li>
        </ul>

        <footer class="flex items-center justify-between gap-4 border-t border-stone-200 pt-3 max-[760px]:flex-col max-[760px]:items-stretch">
          <div>
            <strong class="text-lg text-amber-950">NT$ {{ order.totalAmount }}</strong>
            <p class="m-0 text-sm text-stone-600">{{ actionHint(order.status) }}</p>
          </div>
          <div class="flex flex-wrap justify-end gap-2 max-[760px]:justify-stretch">
            <button
              v-if="primaryNextStatus(order.status)"
              class="min-h-10 rounded-md border border-amber-900 bg-amber-900 px-4 font-bold text-white disabled:opacity-60 max-[760px]:flex-1"
              type="button"
              :disabled="isUpdating === order.id"
              @click="updateStatus(order.id, primaryNextStatus(order.status)!)"
            >
              {{ statusButtonLabel(primaryNextStatus(order.status)!) }}
            </button>
            <button
              v-if="canCancel(order.status)"
              class="min-h-10 rounded-md border border-red-300 bg-white px-4 font-bold text-red-700 disabled:opacity-60 max-[760px]:flex-1"
              type="button"
              :disabled="isUpdating === order.id"
              @click="updateStatus(order.id, 'cancelled')"
            >
              取消訂單
            </button>
          </div>
        </footer>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { Order } from '../../api/order.api';
import { extractApiError } from '../../api/http';
import { useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';
import { useToastStore } from '../../stores/toast.store';

type OrderTransitionStatus = Exclude<Order['status'], 'pending'>;
type QueueFilter = 'active' | 'pending' | 'preparing' | 'ready' | 'done';

const nextStatusesByStatus = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: []
} as const satisfies Record<Order['status'], readonly OrderTransitionStatus[]>;

const primaryStatusByStatus = {
  pending: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
  cancelled: null
} as const satisfies Record<Order['status'], OrderTransitionStatus | null>;

const statusPriority: Record<Order['status'], number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 5
};

const orderStore = useOrderStore();
const toastStore = useToastStore();
const socketStore = useSocketStore();

const activeFilter = ref<QueueFilter>('active');
const isLoading = ref(false);
const isUpdating = ref('');
const errorMessage = ref('');

const queueStatuses = ['pending', 'accepted', 'preparing', 'ready'] as const;
const queueFilters = [
  { value: 'active', label: '進行中' },
  { value: 'pending', label: '待接單' },
  { value: 'preparing', label: '製作中' },
  { value: 'ready', label: '可取餐' },
  { value: 'done', label: '已結束' }
] as const satisfies ReadonlyArray<{ value: QueueFilter; label: string }>;

const soldItems = computed(() => orderStore.todaySummary?.soldItems ?? []);
const activeOrders = computed(() =>
  orderStore.staffOrders.filter((order) => isActiveStatus(order.status))
);
const orderedStaffOrders = computed(() =>
  [...orderStore.staffOrders].sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })
);
const filteredOrders = computed(() =>
  orderedStaffOrders.value.filter((order) => matchesFilter(order, activeFilter.value))
);
const metrics = computed(() => {
  const summary = orderStore.todaySummary;
  if (!summary) return [];

  return [
    { label: '今日營收', value: `NT$ ${summary.paidRevenue}` },
    {
      label: '已付款訂單',
      value: `${summary.paidOrders} / ${summary.totalOrders}`,
      note: `訪客 ${summary.guestOrders} / 會員 ${summary.memberOrders}`
    },
    { label: '進行中訂單', value: `${activeOrders.value.length}` },
    { label: '平均單筆金額', value: `NT$ ${summary.averagePaidOrderValue}` }
  ];
});
const queueHint = computed(() => {
  if (activeFilter.value === 'active') return '待接單會排在最前面，接著是製作中與可取餐。';
  if (activeFilter.value === 'ready') return '可取餐訂單完成後會從進行中佇列移出。';
  if (activeFilter.value === 'done') return '已完成與已取消訂單保留在這裡方便對帳。';
  return '篩選單一狀態時仍依建立時間由舊到新排序。';
});

function matchesFilter(order: Order, filter: QueueFilter) {
  if (filter === 'active') return isActiveStatus(order.status);
  if (filter === 'preparing') return order.status === 'accepted' || order.status === 'preparing';
  if (filter === 'done') return order.status === 'completed' || order.status === 'cancelled';
  return order.status === filter;
}

function filterCount(filter: QueueFilter) {
  return orderedStaffOrders.value.filter((order) => matchesFilter(order, filter)).length;
}

function filterButtonClass(filter: QueueFilter) {
  const base = 'flex min-h-10 items-center gap-2 rounded-md border px-3 font-bold';
  if (activeFilter.value === filter) {
    return `${base} border-amber-900 bg-amber-900 text-white`;
  }
  return `${base} border-stone-300 bg-white text-amber-950`;
}

function isActiveStatus(status: Order['status']) {
  return ['pending', 'accepted', 'preparing', 'ready'].includes(status);
}

function primaryNextStatus(status: Order['status']) {
  return primaryStatusByStatus[status];
}

function canCancel(status: Order['status']) {
  return status === 'pending';
}

function customerLabel(order: Order) {
  const name = order.guestInfo?.name || (order.userId ? '會員訂單' : '訪客訂單');
  const phone = order.guestInfo?.phone ? ` / ${order.guestInfo.phone}` : '';
  return `${name}${phone}`;
}

function actionHint(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: '下一步：確認付款後接單。',
    accepted: '下一步：開始製作。',
    preparing: '下一步：餐點完成後通知可取餐。',
    ready: '下一步：顧客取餐後標記完成。',
    completed: '此訂單已完成。',
    cancelled: '此訂單已取消。'
  };
  return labels[status];
}

function statusLabel(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: '待接單',
    accepted: '已接單',
    preparing: '製作中',
    ready: '可取餐',
    completed: '已完成',
    cancelled: '已取消'
  };
  return labels[status];
}

function paymentStatusLabel(status: Order['paymentStatus']) {
  const labels: Record<Order['paymentStatus'], string> = {
    unpaid: '未付款',
    payment_pending: '付款處理中',
    paid: '已付款',
    payment_failed: '付款失敗',
    refunded: '已退款'
  };
  return labels[status];
}

function statusButtonLabel(status: OrderTransitionStatus) {
  const labels: Record<OrderTransitionStatus, string> = {
    accepted: '接單',
    preparing: '開始製作',
    ready: '標記可取餐',
    completed: '完成取餐',
    cancelled: '取消'
  };
  return labels[status];
}

function statusBadgeClass(status: Order['status']) {
  const base = 'rounded-full px-2 py-1 text-xs font-extrabold';
  if (status === 'ready') return `${base} bg-emerald-600 text-white`;
  if (status === 'completed') return `${base} bg-emerald-100 text-emerald-800`;
  if (status === 'cancelled') return `${base} bg-red-100 text-red-700`;
  if (status === 'pending') return `${base} bg-amber-100 text-amber-900`;
  return `${base} bg-blue-100 text-blue-800`;
}

function paymentBadgeClass(status: Order['paymentStatus']) {
  const base = 'rounded-full px-2 py-1 text-xs font-extrabold';
  if (status === 'paid') return `${base} bg-emerald-100 text-emerald-800`;
  if (status === 'payment_failed') return `${base} bg-red-100 text-red-700`;
  return `${base} bg-stone-200 text-amber-900`;
}

async function loadDashboard() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await Promise.all([
      orderStore.loadTodaySummary(),
      orderStore.loadStaffOrders()
    ]);
  } catch (err) {
    errorMessage.value = extractApiError(err) || '無法載入員工訂單。';
  } finally {
    isLoading.value = false;
  }
}

async function updateStatus(orderId: string, status: OrderTransitionStatus) {
  isUpdating.value = orderId;
  try {
    await orderStore.updateStaffOrderStatus(orderId, status);
    await orderStore.loadTodaySummary();
    toastStore.success('訂單狀態已更新');
  } catch (err) {
    toastStore.error(extractApiError(err) || '無法更新訂單狀態。');
  } finally {
    isUpdating.value = '';
  }
}

watch(
  () => socketStore.newOrderEvent,
  async (event) => {
    if (!event) return;
    await orderStore.loadStaffOrders();
    activeFilter.value = 'active';
    toastStore.success(`新訂單已送達（${event.orderLookupCode}）`);
  }
);

onMounted(() => {
  socketStore.connect();
  socketStore.joinStaffRoom();
  loadDashboard();
});
</script>
