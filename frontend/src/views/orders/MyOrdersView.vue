<template>
  <section class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <p class="m-0 text-sm font-extrabold uppercase text-amber-700">
          Order History
        </p>
        <h1 class="m-0 text-2xl font-bold text-amber-950">
          點餐紀錄
        </h1>
        <p class="m-0 max-w-3xl text-stone-600">
          {{ pageDescription }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          v-if="authStore.user?.role === 'user'"
          class="rounded-md border border-amber-900 px-4 py-2 text-sm font-bold text-amber-950 no-underline"
          to="/orders/guest"
        >
          查看目前訂單
        </RouterLink>
        <PushNotificationToggle v-if="authStore.user?.role === 'user'" />
      </div>
    </header>

    <ul
      v-if="isLoading"
      class="grid list-none gap-3 p-0"
    >
      <li
        v-for="i in 3"
        :key="i"
        class="grid animate-pulse gap-3 rounded-lg border border-stone-200 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="grid gap-2">
            <div class="h-5 w-36 rounded bg-stone-200" />
            <div class="h-3 w-24 rounded bg-stone-200" />
          </div>
          <div class="flex gap-2">
            <div class="h-6 w-16 rounded-full bg-stone-200" />
            <div class="h-6 w-16 rounded-full bg-stone-200" />
          </div>
        </div>
        <div class="h-4 w-28 rounded bg-stone-200" />
      </li>
    </ul>

    <p
      v-else-if="errorMessage"
      class="m-0 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>

    <div
      v-else-if="orderStore.myOrders.length === 0"
      class="grid min-h-40 place-items-center rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center"
    >
      <div>
        <p class="m-0 mt-2 font-semibold text-amber-950">
          尚無點餐紀錄
        </p>
        <p class="m-0 mt-1 text-sm text-stone-600">
          會員訂單完成後會保留在這裡，方便日後查詢。
        </p>
        <RouterLink
          class="mt-3 inline-block rounded-md bg-amber-900 px-4 py-2 text-sm font-bold text-white no-underline"
          to="/products"
        >
          前往點餐
        </RouterLink>
      </div>
    </div>

    <div
      v-else
      class="grid gap-3"
    >
      <div class="grid gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="m-0 text-sm font-bold text-amber-950">
              顯示 {{ visibleOrders.length }} / {{ filteredOrders.length }} 筆
            </p>
            <p class="m-0 text-xs text-stone-500">
              點餐紀錄保留完整歷史；目前製作進度請使用訂單追蹤。
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

        <div class="relative">
          <div class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <div class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
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
        <template
          v-for="group in groupedOrders"
          :key="group.key"
        >
          <div class="flex items-center gap-3 px-1 py-2">
            <div class="h-px flex-1 bg-stone-300" />
            <div class="flex items-center gap-2">
              <span class="whitespace-nowrap text-xs font-bold text-stone-500">
                {{ group.label }}
              </span>
              <span class="rounded-full bg-stone-200 px-1.5 py-0.5 text-xs text-stone-500">
                {{ group.orders.length }} 筆
              </span>
            </div>
            <div class="h-px flex-1 bg-stone-300" />
          </div>

          <ul class="grid list-none gap-3 p-0">
            <li
              v-for="order in group.orders"
              :key="order.id"
              class="grid gap-0 overflow-hidden rounded-lg border border-stone-300 bg-white"
            >
              <button
                class="grid w-full gap-2 p-3 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                type="button"
                :aria-expanded="openOrders.has(order.id)"
                @click="toggleOrder(order.id)"
              >
                <div class="grid min-w-0 gap-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="text-base text-amber-950">
                      訂單 {{ displayOrderCode(order) }}
                    </strong>
                    <span
                      v-if="order.orderType === 'redeem'"
                      class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
                    >
                      點數兌換
                    </span>
                  </div>
                  <span class="truncate text-xs text-stone-500">
                    {{ formatDate(order.createdAt) }} ・ {{ compactItems(order) }}
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
                  <span class="text-xs text-stone-400">
                    {{ openOrders.has(order.id) ? '收合' : '展開' }}
                  </span>
                </div>
              </button>

              <div
                v-if="openOrders.has(order.id)"
                class="border-t border-stone-200"
              >
                <div class="grid gap-3 border-b border-stone-100 bg-stone-50 p-4 sm:grid-cols-3">
                  <div>
                    <p class="m-0 text-xs font-bold text-stone-500">
                      訂單查詢碼
                    </p>
                    <p class="m-0 mt-1 font-bold text-amber-950">
                      {{ displayOrderCode(order) }}
                    </p>
                  </div>
                  <div>
                    <p class="m-0 text-xs font-bold text-stone-500">
                      取餐手機
                    </p>
                    <p class="m-0 mt-1 font-bold text-amber-950">
                      {{ displayPhone(order) }}
                    </p>
                  </div>
                  <div>
                    <p class="m-0 text-xs font-bold text-stone-500">
                      目前狀態
                    </p>
                    <p class="m-0 mt-1 font-bold text-amber-950">
                      {{ statusLabel(liveStatus(order)) }}
                    </p>
                  </div>
                </div>

                <div class="grid gap-3 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-50 p-3">
                    <p class="m-0 text-sm font-semibold text-amber-950">
                      {{ statusMessage(liveStatus(order)) }}
                    </p>
                    <RouterLink
                      v-if="canTrackOrder(order)"
                      class="rounded-md border border-amber-900 bg-white px-3 py-2 text-sm font-bold text-amber-950 no-underline"
                      :to="{ path: '/orders/guest', query: trackingQuery(order) }"
                    >
                      追蹤狀態
                    </RouterLink>
                  </div>

                  <ul class="grid list-none gap-2 p-0">
                    <li
                      v-for="item in order.items"
                      :key="item.productId"
                      class="flex justify-between gap-3 border-b border-stone-100 pb-2 text-sm text-amber-950 last:border-0 last:pb-0"
                    >
                      <span>{{ item.name }} x {{ item.quantity }}</span>
                      <strong>NT$ {{ item.price * item.quantity }}</strong>
                    </li>
                  </ul>
                  <div class="flex items-center justify-between border-t border-stone-100 pt-3">
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-if="order.pointsEarned > 0"
                        class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
                      >
                        獲得 {{ order.pointsEarned }} 點
                      </span>
                      <span
                        v-if="order.pointsRedeemed > 0"
                        class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700"
                      >
                        使用 {{ order.pointsRedeemed }} 點
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
          收合為前 {{ INITIAL_VISIBLE_COUNT }} 筆
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';
import PushNotificationToggle from '../../components/PushNotificationToggle.vue';
import type { Order } from '../../api/order.api';
import { formatDate, paymentLabel, displayOrderCode } from '../../composables/useOrderFormat';

const authStore = useAuthStore();
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
  { value: 'active', label: '進行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

const canViewAllOrders = computed(() => authStore.user?.role === 'admin');
const pageDescription = computed(() =>
  canViewAllOrders.value
    ? '完整訂單歷史列表，可依狀態檢視所有會員與訪客訂單。'
    : '這裡保存完整會員點餐紀錄；即時製作進度請前往訂單追蹤。'
);

function toTaipeiDateKey(dateStr: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(dateStr));
}

function dateGroupLabel(key: string): string {
  const todayKey = toTaipeiDateKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toTaipeiDateKey(yesterday.toISOString());

  if (key === todayKey) return '今天';
  if (key === yesterdayKey) return '昨天';

  const [year, month, day] = key.split('-').map(Number);
  const dow = ['日', '一', '二', '三', '四', '五', '六'][
    new Date(year, month - 1, day).getDay()
  ];
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

function isActiveStatus(status: Order['status']) {
  return ['pending', 'accepted', 'preparing', 'ready'].includes(status);
}

const filterCounts = computed<Record<OrderFilter, number>>(() => ({
  all: sortedOrders.value.length,
  active: sortedOrders.value.filter((order) => isActiveStatus(liveStatus(order))).length,
  completed: sortedOrders.value.filter((order) => liveStatus(order) === 'completed').length,
  cancelled: sortedOrders.value.filter((order) => liveStatus(order) === 'cancelled').length
}));

const filteredOrders = computed(() => {
  if (activeFilter.value === 'active') {
    return sortedOrders.value.filter((order) => isActiveStatus(liveStatus(order)));
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

function liveStatus(order: Order): Order['status'] {
  if (socketStore.latestOrderUpdate?.status && socketStore.latestOrderUpdate.id === order.id) {
    return socketStore.latestOrderUpdate.status as Order['status'];
  }
  return order.status;
}

function statusMessage(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending: '訂單等待店員確認，請至訂單追蹤查看最新進度。',
    accepted: '店員已接單，請至訂單追蹤查看製作進度。',
    preparing: '餐點製作中，請至訂單追蹤查看即時狀態。',
    ready: '餐點已可取餐，請至櫃台核對取餐。',
    completed: '這筆訂單已完成。',
    cancelled: '這筆訂單已取消。'
  };
  return map[status];
}

function paymentBadgeClass(status: Order['paymentStatus']) {
  const base = 'rounded-full px-2 py-1 text-xs font-extrabold uppercase';
  if (status === 'paid') return `${base} bg-emerald-100 text-emerald-800`;
  if (status === 'payment_failed') return `${base} bg-red-100 text-red-700`;
  return `${base} bg-stone-200 text-amber-900`;
}

function statusLabel(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: '待確認',
    accepted: '已接單',
    preparing: '製作中',
    ready: '可取餐',
    completed: '已完成',
    cancelled: '已取消'
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

function compactItems(order: Order) {
  const [firstItem, ...restItems] = order.items;
  if (!firstItem) return '無品項';
  const firstLabel = `${firstItem.name} x${firstItem.quantity}`;
  if (restItems.length === 0) return firstLabel;
  return `${firstLabel} 等 ${order.items.length} 項`;
}

function displayPhone(order: Order) {
  return order.guestInfo?.phone || '未提供手機';
}

function canTrackOrder(order: Order) {
  return Boolean(order.orderLookupCode && order.guestInfo?.phone);
}

function trackingQuery(order: Order) {
  return {
    lookupCode: order.orderLookupCode,
    phone: order.guestInfo?.phone
  };
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
    socketStore.connect();
    socketStore.joinOrderRoom(id);
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
  orderStore.clearOrderLists();
  openOrders.value = new Set();
  try {
    if (canViewAllOrders.value) {
      await orderStore.loadAllOrdersForStaff();
    } else {
      await orderStore.loadMyOrders();
    }
    visibleCount.value = INITIAL_VISIBLE_COUNT;
  } catch {
    errorMessage.value = '無法載入點餐紀錄。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => void loadOrders());
</script>
