<template>
  <section class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">點餐紀錄</h1>
        <p class="m-0 text-stone-600">查看你最近的訂單狀態、付款結果與點餐明細。</p>
      </div>
      <PushNotificationToggle />
    </header>

    <!-- 骨架屏 -->
    <ul v-if="isLoading" class="grid list-none gap-3 p-0">
      <li
        v-for="i in 3"
        :key="i"
        class="animate-pulse grid gap-3 rounded-lg border border-stone-200 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="grid gap-2">
            <div class="h-5 w-36 rounded bg-stone-200"></div>
            <div class="h-3 w-24 rounded bg-stone-200"></div>
          </div>
          <div class="flex gap-2">
            <div class="h-6 w-16 rounded-full bg-stone-200"></div>
            <div class="h-6 w-16 rounded-full bg-stone-200"></div>
          </div>
        </div>
        <div class="h-4 w-28 rounded bg-stone-200"></div>
      </li>
    </ul>

    <!-- 錯誤 -->
    <p
      v-else-if="errorMessage"
      class="m-0 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>

    <!-- 空狀態 -->
    <div
      v-else-if="orderStore.myOrders.length === 0"
      class="grid min-h-40 place-items-center rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center"
    >
      <div>
        <p class="m-0 text-2xl">🛒</p>
        <p class="m-0 mt-2 font-semibold text-amber-950">尚無點餐紀錄</p>
        <RouterLink
          class="mt-2 inline-block rounded-md bg-amber-900 px-4 py-2 text-sm font-bold text-white no-underline"
          to="/products"
        >
          前往點餐
        </RouterLink>
      </div>
    </div>

    <!-- 訂單列表 -->
    <div v-else class="grid gap-3">
      <div
        class="grid gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="m-0 text-sm font-bold text-amber-950">
              顯示 {{ visibleOrders.length }} / {{ filteredOrders.length }} 筆
            </p>
            <p class="m-0 text-xs text-stone-500">
              點選訂單可展開進度與明細。
            </p>
          </div>
          <button
            v-if="hasHiddenOrders"
            class="min-h-9 rounded-md border border-amber-900 bg-white px-3 text-sm font-bold text-amber-950"
            type="button"
            @click="showAllOrders"
          >
            顯示全部
          </button>
        </div>

        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            class="min-h-9 shrink-0 rounded-md border px-3 text-sm font-bold transition-colors"
            :class="activeFilter === option.value ? 'border-amber-900 bg-amber-900 text-white' : 'border-stone-300 bg-white text-amber-950 hover:border-amber-900'"
            type="button"
            @click="setFilter(option.value)"
          >
            {{ option.label }} {{ filterCounts[option.value] }}
          </button>
        </div>
      </div>

      <p
        v-if="filteredOrders.length === 0"
        class="m-0 rounded-lg border border-stone-300 bg-white p-4 text-stone-600"
      >
        目前沒有符合條件的訂單。
      </p>

      <div
        v-else
        class="grid max-h-[68vh] gap-1 overflow-y-auto pr-1"
      >
      <template v-for="group in groupedOrders" :key="group.key">
        <!-- 日期分隔線 -->
        <div class="flex items-center gap-3 px-1 py-2">
          <div class="h-px flex-1 bg-stone-300"></div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-stone-500 whitespace-nowrap">{{ group.label }}</span>
            <span class="rounded-full bg-stone-200 px-1.5 py-0.5 text-xs text-stone-500">{{ group.orders.length }} 筆</span>
          </div>
          <div class="h-px flex-1 bg-stone-300"></div>
        </div>

        <ul class="grid list-none gap-3 p-0">
      <li
        v-for="order in group.orders"
        :key="order.id"
        class="grid gap-0 overflow-hidden rounded-lg border border-stone-300 bg-white"
      >
        <!-- 訂單標頭 -->
        <button
          class="grid w-full gap-2 p-3 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          type="button"
          :aria-expanded="openOrders.has(order.id)"
          @click="toggleOrder(order.id)"
        >
          <div class="grid min-w-0 gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="text-base text-amber-950">
                訂單 {{ order.orderLookupCode || order.id.slice(-6) }}
              </strong>
              <span
                v-if="order.orderType === 'redeem'"
                class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
              >
                點數兌換
              </span>
            </div>
            <span class="truncate text-xs text-stone-500">
              {{ formatDate(order.createdAt) }} · {{ compactItems(order) }}
            </span>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <strong class="text-sm text-amber-950">NT$ {{ order.totalAmount }}</strong>
            <span :class="paymentBadgeClass(order.paymentStatus)">
              {{ paymentLabel(order.paymentStatus) }}
            </span>
            <span :class="statusBadgeClass(liveStatus(order))">
              {{ statusLabel(liveStatus(order)) }}
            </span>
            <span class="text-xs text-stone-400">{{ openOrders.has(order.id) ? '▲' : '▼' }}</span>
          </div>
        </button>

        <!-- 展開詳情 -->
        <div v-if="openOrders.has(order.id)" class="border-t border-stone-200">
          <!-- 狀態步驟條 -->
          <div class="p-4" :class="stepperBgClass(liveStatus(order))">
            <div v-if="liveStatus(order) === 'cancelled'" class="rounded-md border border-red-200 bg-red-50 p-3 text-center">
              <p class="m-0 font-bold text-red-700">訂單已取消</p>
            </div>
            <template v-else>
              <ol class="flex w-full items-start">
                <li
                  v-for="(step, i) in steps"
                  :key="step.status"
                  class="relative flex flex-1 flex-col items-center"
                >
                  <div
                    v-if="i > 0"
                    class="absolute top-4 h-0.5 transition-colors"
                    style="left: calc(-50% + 16px); right: calc(50% + 16px)"
                    :class="stepIndex(step.status) <= currentStepIndex(liveStatus(order)) ? activeLineClass(liveStatus(order)) : 'bg-stone-200'"
                  ></div>
                  <div
                    class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors"
                    :class="circleClass(step.status, liveStatus(order))"
                  >
                    <span v-if="stepIndex(step.status) < currentStepIndex(liveStatus(order))">✓</span>
                    <span
                      v-else-if="step.status === liveStatus(order)"
                      class="h-2.5 w-2.5 rounded-full bg-current"
                      :class="liveStatus(order) === 'ready' ? 'animate-ping' : ''"
                    ></span>
                  </div>
                  <span
                    class="mt-2 text-center text-xs font-bold leading-tight"
                    :class="stepLabelClass(step.status, liveStatus(order))"
                  >
                    {{ step.label }}
                  </span>
                </li>
              </ol>
              <p class="m-0 mt-4 text-center text-sm font-semibold" :class="statusMsgClass(liveStatus(order))">
                {{ statusMessage(liveStatus(order)) }}
              </p>
            </template>
          </div>

          <!-- 點餐明細 -->
          <div class="border-t border-stone-100 p-4">
            <ul class="grid list-none gap-2 p-0">
              <li
                v-for="item in order.items"
                :key="item.productId"
                class="flex justify-between gap-3 border-b border-stone-100 pb-2 text-sm last:border-0 last:pb-0 text-amber-950"
              >
                <span>{{ item.name }} x {{ item.quantity }}</span>
                <strong>NT$ {{ item.price * item.quantity }}</strong>
              </li>
            </ul>
            <div class="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
              <div class="flex flex-wrap gap-2">
                <span
                  v-if="order.pointsEarned > 0"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
                >
                  獲得 {{ order.pointsEarned }} 點
                </span>
                <span
                  v-if="order.orderType === 'redeem'"
                  class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600"
                >
                  點數兌換
                </span>
              </div>
              <strong class="text-amber-950">NT$ {{ order.totalAmount }}</strong>
            </div>
          </div>
        </div>
      </li>
        </ul>
      </template>
      </div>

      <div
        v-if="hasHiddenOrders || isShowingAll"
        class="flex justify-center"
      >
        <button
          v-if="hasHiddenOrders"
          class="min-h-10 rounded-md bg-amber-900 px-4 text-sm font-bold text-white"
          type="button"
          @click="showMoreOrders"
        >
          再顯示 {{ nextVisibleCount }} 筆
        </button>
        <button
          v-else
          class="min-h-10 rounded-md border border-stone-400 bg-white px-4 text-sm font-bold text-amber-950"
          type="button"
          @click="collapseOrders"
        >
          收合為最近 {{ INITIAL_VISIBLE_COUNT }} 筆
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';
import PushNotificationToggle from '../../components/PushNotificationToggle.vue';
import type { Order } from '../../api/order.api';

const orderStore = useOrderStore();
const socketStore = useSocketStore();

const isLoading = ref(false);
const errorMessage = ref('');
const openOrders = ref(new Set<string>());
const INITIAL_VISIBLE_COUNT = 8;
const LOAD_MORE_COUNT = 8;
const visibleCount = ref(INITIAL_VISIBLE_COUNT);
type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';
const activeFilter = ref<OrderFilter>('all');
const filterOptions: Array<{ value: OrderFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '處理中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

// ── Date grouping ─────────────────────────────────────────────────────────────

function toTaipeiDateKey(dateStr: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(dateStr)); // → "YYYY-MM-DD"
}

function dateGroupLabel(key: string): string {
  const todayKey = toTaipeiDateKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toTaipeiDateKey(yesterday.toISOString());

  if (key === todayKey) return '今天';
  if (key === yesterdayKey) return '昨天';

  const [year, month, day] = key.split('-').map(Number);
  const dow = ['日', '一', '二', '三', '四', '五', '六'][new Date(year, month - 1, day).getDay()];
  const currentYear = new Date().getFullYear();
  return currentYear === year
    ? `${month}/${day}（週${dow}）`
    : `${year}/${month}/${day}`;
}

const sortedOrders = computed(() =>
  [...orderStore.myOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
);

const filterCounts = computed<Record<OrderFilter, number>>(() => ({
  all: sortedOrders.value.length,
  active: sortedOrders.value.filter((order) =>
    ['pending', 'accepted', 'preparing', 'ready'].includes(liveStatus(order))
  ).length,
  completed: sortedOrders.value.filter((order) => liveStatus(order) === 'completed').length,
  cancelled: sortedOrders.value.filter((order) => liveStatus(order) === 'cancelled').length
}));

const filteredOrders = computed(() => {
  if (activeFilter.value === 'active') {
    return sortedOrders.value.filter((order) =>
      ['pending', 'accepted', 'preparing', 'ready'].includes(liveStatus(order))
    );
  }
  if (activeFilter.value === 'completed') {
    return sortedOrders.value.filter((order) => liveStatus(order) === 'completed');
  }
  if (activeFilter.value === 'cancelled') {
    return sortedOrders.value.filter((order) => liveStatus(order) === 'cancelled');
  }
  return sortedOrders.value;
});

const visibleOrders = computed(() => filteredOrders.value.slice(0, visibleCount.value));

const hasHiddenOrders = computed(() => visibleCount.value < filteredOrders.value.length);

const isShowingAll = computed(
  () => filteredOrders.value.length > INITIAL_VISIBLE_COUNT && !hasHiddenOrders.value
);

const nextVisibleCount = computed(() =>
  Math.min(LOAD_MORE_COUNT, filteredOrders.value.length - visibleCount.value)
);

const groupedOrders = computed(() => {
  const map = new Map<string, Order[]>();
  for (const order of visibleOrders.value) {
    const key = toTaipeiDateKey(order.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }
  return Array.from(map.entries()).map(([key, orders]) => ({
    key,
    label: dateGroupLabel(key),
    orders
  }));
});

const steps = [
  { status: 'pending',   label: '待處理' },
  { status: 'accepted',  label: '已接單' },
  { status: 'preparing', label: '製作中' },
  { status: 'ready',     label: '可取餐' },
  { status: 'completed', label: '已完成' },
] as const;

const statusOrderMap: Record<string, number> = {
  pending: 0, accepted: 1, preparing: 2, ready: 3, completed: 4
};

function stepIndex(status: string) {
  return statusOrderMap[status] ?? 0;
}

function liveStatus(order: Order): Order['status'] {
  if (socketStore.latestOrderUpdate?.status && socketStore.latestOrderUpdate.id === order.id) {
    return socketStore.latestOrderUpdate.status as Order['status'];
  }
  return order.status;
}

function currentStepIndex(status: Order['status']) {
  return stepIndex(status);
}

function activeLineClass(status: Order['status']) {
  if (status === 'ready' || status === 'completed') return 'bg-emerald-500';
  return 'bg-amber-900';
}

function circleClass(stepStatus: string, currentStatus: Order['status']) {
  const idx = stepIndex(stepStatus);
  const cur = currentStepIndex(currentStatus);
  const isGreen = currentStatus === 'ready' || currentStatus === 'completed';
  if (idx < cur) return isGreen ? 'bg-emerald-600 text-white' : 'bg-amber-900 text-white';
  if (stepStatus === currentStatus)
    return isGreen
      ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
      : 'bg-amber-900 text-white ring-4 ring-amber-200';
  return 'bg-stone-100 text-stone-300 ring-1 ring-stone-200';
}

function stepLabelClass(stepStatus: string, currentStatus: Order['status']) {
  const isGreen = currentStatus === 'ready' || currentStatus === 'completed';
  if (stepIndex(stepStatus) <= stepIndex(currentStatus))
    return isGreen ? 'text-emerald-700' : 'text-amber-950';
  return 'text-stone-400';
}

function stepperBgClass(status: Order['status']) {
  if (status === 'ready') return 'bg-emerald-50';
  if (status === 'completed') return 'bg-amber-50';
  return 'bg-white';
}

function statusMessage(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending:   '訂單已送出，等待店家確認中。',
    accepted:  '店家已收到訂單，即將開始製作。',
    preparing: '店員正在準備您的餐點，請稍候。',
    ready:     '您的餐點已完成，請到櫃檯取餐。',
    completed: '謝謝您，這筆訂單已完成。',
    cancelled: '這筆訂單已取消。'
  };
  return map[status];
}

function statusMsgClass(status: Order['status']) {
  if (status === 'ready') return 'text-emerald-800';
  if (status === 'completed') return 'text-emerald-700';
  return 'text-stone-600';
}

function paymentLabel(status: Order['paymentStatus']) {
  const labels: Record<Order['paymentStatus'], string> = {
    unpaid: '未付款',
    payment_pending: '付款處理中',
    paid: '已付款',
    payment_failed: '付款失敗',
    refunded: '已退款'
  };
  return labels[status];
}

function paymentBadgeClass(status: Order['paymentStatus']) {
  const base = 'rounded-full px-2 py-1 text-xs font-extrabold uppercase';
  if (status === 'paid') return `${base} bg-emerald-100 text-emerald-800`;
  if (status === 'payment_failed') return `${base} bg-red-100 text-red-700`;
  return `${base} bg-stone-200 text-amber-900`;
}

function statusLabel(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: '待處理', accepted: '已接單', preparing: '製作中',
    ready: '可取餐', completed: '已完成', cancelled: '已取消'
  };
  return labels[status];
}

function statusBadgeClass(status: Order['status']) {
  const base = 'rounded-full px-2 py-1 text-xs font-extrabold uppercase';
  if (status === 'ready') return `${base} bg-emerald-600 text-white`;
  if (status === 'completed') return `${base} bg-emerald-100 text-emerald-800`;
  if (status === 'cancelled') return `${base} bg-red-100 text-red-700`;
  return `${base} bg-amber-900 text-white`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

function compactItems(order: Order) {
  const [firstItem, ...restItems] = order.items;
  if (!firstItem) return '無品項';
  const firstLabel = `${firstItem.name} x${firstItem.quantity}`;
  if (restItems.length === 0) return firstLabel;
  return `${firstLabel} 等 ${order.items.length} 項`;
}

function setFilter(filter: OrderFilter) {
  activeFilter.value = filter;
  visibleCount.value = INITIAL_VISIBLE_COUNT;
  openOrders.value = new Set();
}

function toggleOrder(id: string) {
  if (openOrders.value.has(id)) {
    openOrders.value.delete(id);
  } else {
    openOrders.value.add(id);
    // 加入 socket room 接收即時更新
    const order = orderStore.myOrders.find(o => o.id === id);
    if (order) {
      socketStore.connect();
      socketStore.joinOrderRoom(id);
    }
  }
}

function showMoreOrders() {
  visibleCount.value = Math.min(
    visibleCount.value + LOAD_MORE_COUNT,
    filteredOrders.value.length
  );
}

function showAllOrders() {
  visibleCount.value = filteredOrders.value.length;
}

function collapseOrders() {
  visibleCount.value = INITIAL_VISIBLE_COUNT;
  openOrders.value = new Set(
    [...openOrders.value].filter((id) =>
      visibleOrders.value.some((order) => order.id === id)
    )
  );
}

async function loadOrders() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await orderStore.loadMyOrders();
    visibleCount.value = INITIAL_VISIBLE_COUNT;
  } catch {
    errorMessage.value = '無法載入點餐紀錄。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => void loadOrders());
</script>
