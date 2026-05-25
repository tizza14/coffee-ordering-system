<template>
  <section class="min-h-[calc(100vh-64px)] bg-amber-50 p-4 sm:p-6">
    <div class="mx-auto grid max-w-6xl content-start gap-5">
      <header class="grid gap-2">
        <p class="m-0 text-sm font-extrabold uppercase text-amber-700">
          Order Tracking
        </p>
        <h1 class="m-0 text-2xl font-bold text-amber-950 sm:text-3xl">
          訂單追蹤
        </h1>
        <p class="m-0 max-w-3xl text-stone-600">
          查看目前訂單狀態、付款狀態、點餐明細與通知紀錄。
        </p>
      </header>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div class="grid content-start gap-4">
          <section class="grid gap-5 rounded-lg border border-stone-300 bg-white p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="m-0 text-lg font-bold text-amber-950">
                  {{ authStore.user?.role === 'user' ? '會員訂單' : '查詢訂單資料' }}
                </h2>
                <p class="m-0 text-sm text-stone-600">
                  {{
                    authStore.user?.role === 'user'
                      ? '系統會自動顯示最近一筆進行中訂單，也可以手動選擇其他訂單。'
                      : '請輸入結帳後取得的查詢碼與手機號碼。'
                  }}
                </p>
              </div>
              <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                {{ authStore.user?.role === 'user' ? '會員' : '訪客' }}
              </span>
            </div>

            <div v-if="authStore.user?.role === 'user'" class="grid gap-3">
              <div>
                <h3 class="m-0 text-base font-bold text-amber-950">
                  近期訂單
                </h3>
                <p class="m-0 text-sm text-stone-600">
                  可直接點選訂單帶入查詢；未完成訂單會優先自動顯示。
                </p>
              </div>
              <p
                v-if="isLoadingMemberOrders"
                class="m-0 rounded-md bg-stone-50 p-3 text-sm text-stone-500"
              >
                載入會員訂單中...
              </p>
              <p
                v-else-if="memberTrackingOrders.length === 0"
                class="m-0 rounded-md bg-stone-50 p-3 text-sm text-stone-500"
              >
                目前沒有可追蹤的會員訂單。
              </p>
              <ul v-else class="grid list-none gap-2 p-0">
                <li v-for="order in memberTrackingOrders" :key="order.id">
                  <button
                    class="grid w-full cursor-pointer gap-3 rounded-md border border-stone-200 bg-white p-3 text-left transition hover:border-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    :aria-label="`查詢訂單 ${displayOrderCode(order)}`"
                    :disabled="!canLookupOrder(order) || isLoading"
                    @click="fillMemberOrder(order)"
                  >
                    <span class="flex flex-wrap items-start justify-between gap-3">
                      <span class="grid gap-1">
                        <strong class="text-amber-950">
                          訂單 {{ displayOrderCode(order) }}
                        </strong>
                        <span class="text-sm text-stone-600">
                          取餐手機：{{ displayPhone(order) }}
                        </span>
                      </span>
                      <span :class="statusBadgeClass(order.status)">
                        {{ statusLabel(order.status) }}
                      </span>
                    </span>
                    <span class="text-sm font-bold text-amber-900">
                      {{ isCurrentMemberOrder(order) ? '目前顯示中' : '帶入查詢' }}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            <form class="grid gap-3 border-t border-stone-200 pt-4" @submit.prevent="load">
              <div>
                <h3 class="m-0 text-base font-bold text-amber-950">
                  手動查詢
                </h3>
                <p class="m-0 text-sm text-stone-600">
                  輸入結帳後取得的查詢碼與取餐手機；本機有記錄的訂單會在輸入手機後出現。
                </p>
              </div>
              <label class="grid gap-1.5 font-semibold">
                訂單查詢碼
                <input
                  v-model="lookupCode"
                  class="min-h-11 rounded-md border border-stone-400 px-3"
                  placeholder="例如 DEMO0001"
                  required
                />
              </label>
              <label class="grid gap-1.5 font-semibold">
                手機
                <input
                  v-model="phone"
                  class="min-h-11 rounded-md border border-stone-400 px-3"
                  pattern="09[0-9]{8}"
                  placeholder="例如 0912345678"
                  :required="!normalizedGuestToken"
                />
              </label>

              <!-- 本機保存的訂單 (依手機號碼篩選，保護不同訪客資料) -->
              <div v-if="matchingGuestSessions.length > 0" class="grid gap-2">
                <p class="m-0 text-sm font-semibold text-stone-600">本機保存的訂單</p>
                <ul class="grid list-none gap-1.5 p-0">
                  <li v-for="session in matchingGuestSessions" :key="session.lookupCode">
                    <button
                      class="grid w-full cursor-pointer gap-0.5 rounded-md border border-stone-200 bg-stone-50 p-2.5 text-left transition hover:border-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      type="button"
                      :disabled="isLoading"
                      @click="fillGuestSession(session)"
                    >
                      <span class="text-sm font-bold text-amber-950">
                        訂單 {{ session.lookupCode }}
                      </span>
                      <span class="text-xs text-stone-400">
                        {{ formatSavedAt(session.savedAt) }}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>

              <button
                v-if="shouldShowLookupButton"
                class="h-11 cursor-pointer rounded-md bg-amber-900 px-4 font-bold text-white disabled:opacity-60"
                type="submit"
                :disabled="isLoading"
              >
                {{ lookupButtonLabel }}
              </button>
              <p
                v-else
                class="m-0 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
              >
                目前已顯示這筆訂單；修改查詢碼或手機後可重新查詢。
              </p>
              <p
                v-if="errorMessage"
                class="m-0 rounded-md border border-red-200 bg-red-50 p-3 font-semibold text-red-700"
              >
                {{ errorMessage }}
              </p>
            </form>
          </section>
        </div>

        <div class="grid content-start gap-4">
          <section class="grid gap-3 rounded-lg border border-stone-300 bg-white p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="m-0 text-xl font-bold text-amber-950">
                  目前訂單狀態
                </h2>
                <p class="m-0 text-sm text-stone-600">
                  查詢成功後會顯示付款、製作進度與品項明細。
                </p>
              </div>
              <span
                v-if="orderStore.currentOrder"
                :class="statusBadgeClass(liveCurrentStatus)"
              >
                {{ statusLabel(liveCurrentStatus) }}
              </span>
            </div>

            <div
              v-if="!orderStore.currentOrder"
              class="grid min-h-52 place-items-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-stone-500"
            >
              <div>
                <p class="m-0 mt-2 font-semibold">尚未載入訂單</p>
                <p class="m-0 text-sm">
                  請輸入查詢資料，或登入會員查看近期訂單。
                </p>
              </div>
            </div>

            <template v-else>
              <div
                class="rounded-lg border p-5 transition-colors"
                :class="stepperContainerClass"
              >
                <div class="mb-4 grid gap-2 rounded-md bg-white/70 p-3 sm:grid-cols-3">
                  <p class="m-0">
                    <span class="block text-xs font-bold text-stone-500">
                      訂單查詢碼
                    </span>
                    <span class="flex items-center gap-2">
                      <strong class="text-amber-950">
                        {{ displayOrderCode(orderStore.currentOrder) }}
                      </strong>
                      <button
                        v-if="orderStore.currentOrder?.orderLookupCode"
                        type="button"
                        class="cursor-pointer rounded px-1.5 py-0.5 text-xs font-bold transition"
                        :class="codeCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500 hover:bg-amber-100 hover:text-amber-900'"
                        :aria-label="`複製訂單碼 ${orderStore.currentOrder.orderLookupCode}`"
                        @click="copyOrderCode(orderStore.currentOrder!.orderLookupCode!)"
                      >
                        {{ codeCopied ? '已複製 ✓' : '複製' }}
                      </button>
                    </span>
                  </p>
                  <p class="m-0">
                    <span class="block text-xs font-bold text-stone-500">
                      手機
                    </span>
                    <strong class="text-amber-950">
                      {{ displayPhone(orderStore.currentOrder) }}
                    </strong>
                  </p>
                  <p class="m-0">
                    <span class="block text-xs font-bold text-stone-500">
                      付款狀態
                    </span>
                    <strong class="text-amber-950">
                      {{ paymentLabel(orderStore.currentOrder.paymentStatus) }}
                    </strong>
                  </p>
                </div>

                <div
                  v-if="currentStatus === 'cancelled'"
                  class="rounded-md border border-red-200 bg-red-50 p-4 text-center"
                >
                  <p class="m-0 text-lg font-extrabold text-red-700">
                    訂單已取消
                  </p>
                  <p class="m-0 mt-1 text-sm text-red-500">
                    這筆訂單目前不會繼續製作。
                  </p>
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
                        :class="stepIndex(step.status) <= currentStepIndex ? activeLineClass : 'bg-stone-200'"
                      ></div>
                      <div
                        class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors"
                        :class="circleClass(step.status)"
                      >
                        <span v-if="stepIndex(step.status) < currentStepIndex">✓</span>
                        <span
                          v-else-if="step.status === currentStatus"
                          class="h-2.5 w-2.5 rounded-full bg-current"
                          :class="currentStatus === 'ready' ? 'animate-ping' : ''"
                        ></span>
                      </div>
                      <span
                        class="mt-2 text-center text-xs font-bold leading-tight"
                        :class="stepLabelClass(step.status)"
                      >
                        {{ step.label }}
                      </span>
                    </li>
                  </ol>
                  <p
                    class="m-0 mt-5 text-center text-sm font-semibold"
                    :class="statusMessageClass"
                  >
                    {{ statusMessage }}
                  </p>
                </template>
              </div>

              <div
                v-if="latestNotification"
                class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <span class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>
                <div>
                  <p class="m-0 text-xs font-extrabold uppercase tracking-wide text-amber-700">
                    最新通知
                  </p>
                  <p class="m-0 mt-0.5 text-sm font-bold text-amber-950">
                    {{ latestNotification.message }}
                  </p>
                </div>
              </div>

              <div class="rounded-lg border border-stone-300 bg-white">
                <button
                  class="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 text-left font-bold text-amber-950"
                  type="button"
                  :aria-expanded="itemDetailsOpen"
                  @click="itemDetailsOpen = !itemDetailsOpen"
                >
                  <span>點餐明細</span>
                  <span class="text-sm text-stone-500">
                    {{ itemDetailsOpen ? '收合' : '展開' }}
                  </span>
                </button>
                <div v-if="itemDetailsOpen" class="border-t border-stone-200 p-4">
                  <ul class="grid list-none gap-2 p-0">
                    <li
                      v-for="item in orderStore.currentOrder.items"
                      :key="item.productId"
                      class="flex justify-between gap-3 border-b border-stone-100 pb-2 text-amber-950 last:border-0 last:pb-0"
                    >
                      <span>{{ item.name }} x {{ item.quantity }}</span>
                      <strong>NT$ {{ item.price * item.quantity }}</strong>
                    </li>
                  </ul>
                  <p class="m-0 mt-3 border-t border-stone-200 pt-3 text-right font-extrabold text-amber-950">
                    總金額：NT$ {{ orderStore.currentOrder.totalAmount }}
                  </p>
                </div>
              </div>
            </template>
          </section>

          <section
            v-if="notificationStore.items.length > 0"
            class="rounded-lg border border-stone-300 bg-white"
          >
            <button
              class="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 text-left font-bold text-amber-950"
              type="button"
              :aria-expanded="notificationsOpen"
              @click="notificationsOpen = !notificationsOpen"
            >
              <span>
                通知紀錄
                <span class="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  {{ notificationStore.items.length }}
                </span>
              </span>
              <span class="text-sm text-stone-500">
                {{ notificationsOpen ? '收合' : '展開' }}
              </span>
            </button>
            <ul
              v-if="notificationsOpen"
              class="grid list-none gap-2 border-t border-stone-200 p-3"
            >
              <li
                v-for="notification in notificationStore.items"
                :key="notification.id"
                class="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3"
              >
                <span class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400"></span>
                <div class="grid gap-0.5">
                  <strong class="text-sm text-amber-950">
                    {{ notification.message }}
                  </strong>
                  <span class="text-xs text-stone-400">
                    {{ formatTime(notification.createdAt) }}
                  </span>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Order } from '../../api/order.api';
import { useAuthStore } from '../../stores/auth.store';
import { useNotificationStore } from '../../stores/notification.store';
import { type GuestTrackingSession, useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';

const route = useRoute();
const authStore = useAuthStore();
const orderStore = useOrderStore();
const notificationStore = useNotificationStore();
const socketStore = useSocketStore();

// Do NOT auto-fill from localStorage — different guests on the same device
// should not see each other's sessions. URL query params (from Line Pay redirect) are fine.
const lookupCode = ref(String(route.query.lookupCode ?? ''));
const phone = ref(String(route.query.phone ?? ''));
const guestToken = ref(String(route.query.guestToken ?? ''));
const errorMessage = ref('');
const isLoading = ref(false);
const itemDetailsOpen = ref(true);
const notificationsOpen = ref(true);
const loadedLookupCode = ref('');
const loadedPhone = ref('');
const loadedGuestToken = ref('');
const isLoadingMemberOrders = ref(false);
const codeCopied = ref(false);

async function copyOrderCode(code: string) {
  await navigator.clipboard.writeText(code);
  codeCopied.value = true;
  setTimeout(() => { codeCopied.value = false; }, 2000);
}

interface ApiErrorBody {
  code?: string;
  message?: string;
}

interface CodedError {
  code?: string;
}

const currentStatus = computed(
  () => socketStore.latestOrderUpdate?.status ?? orderStore.currentOrder?.status
);
const liveCurrentStatus = computed(
  () => currentStatus.value ?? orderStore.currentOrder?.status ?? 'pending'
);
const latestNotification = computed(() => notificationStore.items[0]);
const normalizedLookupCode = computed(() => lookupCode.value.trim().toUpperCase());
const normalizedPhone = computed(() => phone.value.trim());
const normalizedGuestToken = computed(() => guestToken.value.trim());
const isCurrentQueryLoaded = computed(
  () =>
    Boolean(orderStore.currentOrder) &&
    normalizedLookupCode.value === loadedLookupCode.value &&
    normalizedPhone.value === loadedPhone.value &&
    normalizedGuestToken.value === loadedGuestToken.value
);
const shouldShowLookupButton = computed(() => !isCurrentQueryLoaded.value);
const lookupButtonLabel = computed(() =>
  isLoading.value ? '查詢中...' : '查詢訂單'
);
const memberTrackingOrders = computed(() => orderStore.myOrders.slice(0, 5));

// Show stored guest sessions for the typed phone (guest mode only)
const matchingGuestSessions = computed((): GuestTrackingSession[] => {
  if (authStore.user?.role === 'user') return [];
  const p = normalizedPhone.value;
  if (!p) return [];
  return [...orderStore.guestSessions]
    .filter((s) => s.phone === p)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 5);
});

const steps = [
  { status: 'pending', label: '待確認' },
  { status: 'accepted', label: '已接單' },
  { status: 'preparing', label: '製作中' },
  { status: 'ready', label: '可取餐' },
  { status: 'completed', label: '已完成' }
] as const;

const statusOrderMap: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  completed: 4
};

function stepIndex(status: string) {
  return statusOrderMap[status] ?? 0;
}

const currentStepIndex = computed(() => stepIndex(currentStatus.value ?? 'pending'));
const isReady = computed(() => currentStatus.value === 'ready');

const stepperContainerClass = computed(() => {
  if (isReady.value) return 'border-emerald-400 bg-emerald-50';
  if (currentStatus.value === 'completed') return 'border-amber-300 bg-amber-50';
  return 'border-stone-300 bg-white';
});

const activeLineClass = computed(() =>
  isReady.value || currentStatus.value === 'completed'
    ? 'bg-emerald-500'
    : 'bg-amber-900'
);

function circleClass(status: string) {
  const idx = stepIndex(status);
  const cur = currentStepIndex.value;
  if (isReady.value || currentStatus.value === 'completed') {
    if (idx < cur) return 'bg-emerald-600 text-white';
    if (status === currentStatus.value) {
      return isReady.value
        ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
        : 'bg-emerald-600 text-white';
    }
  } else {
    if (idx < cur) return 'bg-amber-900 text-white';
    if (status === currentStatus.value) {
      return 'bg-amber-900 text-white ring-4 ring-amber-200';
    }
  }
  return 'bg-stone-100 text-stone-300 ring-1 ring-stone-200';
}

function stepLabelClass(status: string) {
  const idx = stepIndex(status);
  const cur = currentStepIndex.value;
  if (idx <= cur) {
    if (isReady.value || currentStatus.value === 'completed') return 'text-emerald-700';
    return 'text-amber-950';
  }
  return 'text-stone-400';
}

const statusMessage = computed(() => {
  if (currentStatus.value === 'ready') return '餐點已可取餐，請至櫃台核對取餐。';
  if (currentStatus.value === 'completed') return '謝謝您，這筆訂單已完成。';
  if (currentStatus.value === 'preparing') return '店員正在製作餐點，請稍候。';
  if (currentStatus.value === 'accepted') return '店員已接單，準備開始製作。';
  return '訂單已送出，等待店員確認。';
});

const statusMessageClass = computed(() => {
  if (isReady.value) return 'text-emerald-800';
  if (currentStatus.value === 'completed') return 'text-emerald-700';
  return 'text-stone-600';
});

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
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
  const base = 'rounded-full px-2.5 py-1 text-xs font-extrabold';
  if (status === 'ready') return `${base} bg-emerald-600 text-white`;
  if (status === 'completed') return `${base} bg-emerald-100 text-emerald-800`;
  if (status === 'cancelled') return `${base} bg-red-100 text-red-700`;
  return `${base} bg-amber-100 text-amber-900`;
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

function displayOrderCode(order: Order) {
  if (order.orderLookupCode) return order.orderLookupCode;
  if (order.orderType === 'redeem') return '兌換訂單';
  return '未產生查詢碼';
}

function displayPhone(order: Order) {
  return order.guestInfo?.phone || '未提供手機';
}

function canLookupOrder(order: Order) {
  return Boolean(order.orderLookupCode && order.guestInfo?.phone);
}

function isActiveOrder(order: Order) {
  return !['completed', 'cancelled'].includes(order.status);
}

function formatSavedAt(ts: number) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ts));
}

async function fillGuestSession(session: GuestTrackingSession) {
  lookupCode.value = session.lookupCode;
  phone.value = session.phone ?? '';
  guestToken.value = session.guestToken ?? '';
  await nextTick();
  await load();
}

async function fillMemberOrder(order: Order) {
  if (!canLookupOrder(order)) return;
  lookupCode.value = order.orderLookupCode ?? '';
  phone.value = order.guestInfo?.phone ?? '';
  guestToken.value = '';
  await nextTick();
  await load();
}

function isCurrentMemberOrder(order: Order) {
  return Boolean(
    orderStore.currentOrder &&
      order.orderLookupCode &&
      order.orderLookupCode === loadedLookupCode.value &&
      order.guestInfo?.phone === loadedPhone.value
  );
}

async function loadMemberTrackingOrders() {
  if (authStore.user?.role !== 'user') return;
  isLoadingMemberOrders.value = true;
  try {
    await orderStore.loadMyOrders();
    if (lookupCode.value || orderStore.currentOrder) return;

    const activeOrder =
      orderStore.myOrders.find((order) => canLookupOrder(order) && isActiveOrder(order)) ??
      orderStore.myOrders.find((order) => canLookupOrder(order));
    if (activeOrder) await fillMemberOrder(activeOrder);
  } finally {
    isLoadingMemberOrders.value = false;
  }
}

async function load() {
  errorMessage.value = '';
  isLoading.value = true;
  const trackingLookupCode = normalizedLookupCode.value;
  const trackingPhone = normalizedPhone.value;
  const trackingGuestToken = normalizedGuestToken.value;
  const tokenForLookup = trackingPhone ? '' : trackingGuestToken;
  lookupCode.value = trackingLookupCode;
  phone.value = trackingPhone;
  guestToken.value = trackingGuestToken;
  notificationStore.items = [];
  try {
    const order = await orderStore.loadGuestOrder(
      trackingLookupCode,
      trackingPhone || undefined,
      tokenForLookup || undefined
    );

    try {
      await notificationStore.loadGuestNotifications(
        trackingLookupCode,
        trackingPhone || undefined,
        tokenForLookup || undefined
      );
    } catch {
      notificationStore.items = [];
    }

    if (trackingGuestToken && order.id) {
      socketStore.connect({
        orderLookupCode: trackingLookupCode,
        guestToken: trackingGuestToken
      });
      socketStore.joinOrderRoom(order.id);
    }
    loadedLookupCode.value = trackingLookupCode;
    loadedPhone.value = trackingPhone;
    loadedGuestToken.value = trackingGuestToken;
  } catch (error) {
    const isOrderNotFound =
      axios.isAxiosError<ApiErrorBody>(error) &&
      (error.response?.status === 404 ||
        error.response?.data?.code === 'ORDER_NOT_FOUND' ||
        error.response?.data?.code === 'GUEST_LOOKUP_INVALID');
    const isEmptyResult =
      (error as CodedError).code === 'ORDER_NOT_FOUND' ||
      (error as CodedError).code === 'GUEST_LOOKUP_INVALID';

    if (isOrderNotFound || isEmptyResult) {
      orderStore.removeGuestSession(trackingLookupCode);
      guestToken.value = '';
      loadedLookupCode.value = '';
      loadedPhone.value = '';
      loadedGuestToken.value = '';
      errorMessage.value = '查無此訂單，請確認查詢碼與手機號碼是否正確。';
    } else {
      errorMessage.value = '無法載入訂單追蹤，請稍後再試。';
    }
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadMemberTrackingOrders();
  if (lookupCode.value && (guestToken.value || phone.value)) {
    void load();
  }
});
</script>
