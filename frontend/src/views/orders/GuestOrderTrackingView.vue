<template>
  <section class="min-h-[calc(100vh-64px)] bg-amber-50 p-4 sm:p-6">
    <div class="mx-auto grid max-w-6xl content-start gap-5">
      <header class="grid gap-2">
        <p class="m-0 text-sm font-extrabold uppercase text-amber-700">Order Tracking</p>
        <h1 class="m-0 text-2xl font-bold text-amber-950 sm:text-3xl">訂單追蹤</h1>
        <p class="m-0 max-w-3xl text-stone-600">
          訪客可用查詢碼與手機查詢；會員登入後可在同一區塊直接查看自己的近期訂單。
        </p>
      </header>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div class="grid content-start gap-4">
          <section class="grid gap-5 rounded-lg border border-stone-300 bg-white p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="m-0 text-lg font-bold text-amber-950">查詢訂單</h2>
                <p class="m-0 text-sm text-stone-600">手動查詢，或從會員近期訂單直接查看狀態。</p>
              </div>
              <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                訪客 / 會員
              </span>
            </div>

            <form class="grid gap-3" @submit.prevent="load">
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
                手機號碼
                <input
                  v-model="phone"
                  class="min-h-11 rounded-md border border-stone-400 px-3"
                  pattern="09[0-9]{8}"
                  placeholder="例如 0912345678"
                  :required="!normalizedGuestToken"
                />
              </label>
              <div class="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
                <p class="m-0 font-bold text-amber-950">查詢會顯示</p>
                <p class="m-0 mt-1">目前狀態、取餐進度、餐點明細與通知紀錄。手機號碼輸入錯誤時會顯示無此訂單。</p>
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
                目前已顯示這筆訂單狀態；修改查詢碼或手機號碼即可查詢其他訂單。
              </p>
              <p v-if="errorMessage" class="m-0 rounded-md border border-red-200 bg-red-50 p-3 font-semibold text-red-700">
                {{ errorMessage }}
              </p>
            </form>

            <div
              v-if="authStore.user?.role === 'user'"
              class="grid gap-3 border-t border-stone-200 pt-4"
            >
              <div>
                <h3 class="m-0 text-base font-bold text-amber-950">我的近期訂單</h3>
                <p class="m-0 text-sm text-stone-600">不用輸入查詢碼，直接選一筆查看。</p>
              </div>
              <p v-if="isLoadingMemberOrders" class="m-0 text-sm text-stone-500">
                載入會員訂單中...
              </p>
              <p v-else-if="memberTrackingOrders.length === 0" class="m-0 text-sm text-stone-500">
                目前沒有會員訂單。
              </p>
              <ul v-else class="grid list-none gap-2 p-0">
                <li
                  v-for="order in memberTrackingOrders"
                  :key="order.id"
                  class="grid gap-3 rounded-md border border-stone-200 p-3"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="grid gap-1">
                      <strong class="text-amber-950">訂單 {{ displayOrderCode(order) }}</strong>
                      <span class="text-sm text-stone-600">手機號碼：{{ displayPhone(order) }}</span>
                    </div>
                    <span :class="statusBadgeClass(order.status)">
                      {{ statusLabel(order.status) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="min-h-9 rounded-md bg-amber-900 px-3 text-sm font-bold text-white"
                      type="button"
                      @click="selectMemberOrder(order)"
                    >
                      查看這筆訂單狀態
                    </button>
                    <button
                      class="min-h-9 rounded-md border border-amber-900 bg-white px-3 text-sm font-bold text-amber-950 disabled:opacity-50"
                      type="button"
                      :disabled="!order.orderLookupCode || !order.guestInfo?.phone"
                      @click="fillMemberOrder(order)"
                    >
                      複製到查詢欄
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div class="grid content-start gap-4">
          <section class="grid gap-3 rounded-lg border border-stone-300 bg-white p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="m-0 text-xl font-bold text-amber-950">目前訂單狀態</h2>
                <p class="m-0 text-sm text-stone-600">查詢或選取訂單後，這裡會固定顯示進度與明細。</p>
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
          <p class="m-0 mt-2 font-semibold">查詢結果會顯示在這裡</p>
          <p class="m-0 text-sm">送出查詢或從「我的近期訂單」選取一筆訂單。</p>
        </div>
      </div>

      <template v-else>
        <!-- 狀態步驟條 -->
        <div
          class="rounded-lg border p-5 transition-colors"
          :class="stepperContainerClass"
        >
          <div class="mb-4 grid gap-2 rounded-md bg-white/70 p-3 sm:grid-cols-3">
            <p class="m-0">
              <span class="block text-xs font-bold text-stone-500">訂單查詢碼</span>
              <strong class="text-amber-950">{{ displayOrderCode(orderStore.currentOrder) }}</strong>
            </p>
            <p class="m-0">
              <span class="block text-xs font-bold text-stone-500">手機號碼</span>
              <strong class="text-amber-950">{{ displayPhone(orderStore.currentOrder) }}</strong>
            </p>
            <p class="m-0">
              <span class="block text-xs font-bold text-stone-500">付款狀態</span>
              <strong class="text-amber-950">{{ paymentLabel(orderStore.currentOrder.paymentStatus) }}</strong>
            </p>
          </div>

          <!-- 已取消特殊狀態 -->
          <div
            v-if="currentStatus === 'cancelled'"
            class="rounded-md border border-red-200 bg-red-50 p-4 text-center"
          >
            <p class="m-0 text-lg font-extrabold text-red-700">訂單已取消</p>
            <p class="m-0 mt-1 text-sm text-red-500">這筆訂單已取消。</p>
          </div>

          <!-- 正常步驟條 -->
          <template v-else>
            <ol class="flex w-full items-start">
              <li
                v-for="(step, i) in steps"
                :key="step.status"
                class="relative flex flex-1 flex-col items-center"
              >
                <!-- 連接線（除第一步外） -->
                <div
                  v-if="i > 0"
                  class="absolute top-4 h-0.5 transition-colors"
                  style="left: calc(-50% + 16px); right: calc(50% + 16px)"
                  :class="stepIndex(step.status) <= currentStepIndex ? activeLineClass : 'bg-stone-200'"
                ></div>

                <!-- 圓圈 -->
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

                <!-- 標籤 -->
                <span
                  class="mt-2 text-center text-xs font-bold leading-tight"
                  :class="stepLabelClass(step.status)"
                >
                  {{ step.label }}
                </span>
              </li>
            </ol>

            <!-- 狀態說明文字 -->
            <p class="m-0 mt-5 text-center text-sm font-semibold" :class="statusMessageClass">
              {{ statusMessage }}
            </p>
          </template>
        </div>

        <!-- 最新通知 -->
        <div
          v-if="latestNotification"
          class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <span class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>
          <div>
            <p class="m-0 text-xs font-extrabold uppercase tracking-wide text-amber-700">最新通知</p>
            <p class="m-0 mt-0.5 text-sm font-bold text-amber-950">{{ latestNotification.message }}</p>
          </div>
        </div>

        <!-- 點餐明細 -->
        <div class="rounded-lg border border-stone-300 bg-white">
          <button
            class="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 text-left font-bold text-amber-950"
            type="button"
            :aria-expanded="itemDetailsOpen"
            @click="itemDetailsOpen = !itemDetailsOpen"
          >
            <span>點餐明細</span>
            <span class="text-sm text-stone-500">{{ itemDetailsOpen ? '收合' : '展開' }}</span>
          </button>
          <div v-if="itemDetailsOpen" class="border-t border-stone-200 p-4">
            <ul class="grid list-none gap-2 p-0">
              <li
                v-for="item in orderStore.currentOrder.items"
                :key="item.productId"
                class="flex justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0 text-amber-950"
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
              <span class="text-sm text-stone-500">{{ notificationsOpen ? '收合' : '展開' }}</span>
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
                  <strong class="text-sm text-amber-950">{{ notification.message }}</strong>
                  <span class="text-xs text-stone-400">{{ formatTime(notification.createdAt) }}</span>
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
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Order } from '../../api/order.api';
import { useAuthStore } from '../../stores/auth.store';
import { useNotificationStore } from '../../stores/notification.store';
import { useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';

const route = useRoute();
const authStore = useAuthStore();
const orderStore = useOrderStore();
const notificationStore = useNotificationStore();
const socketStore = useSocketStore();

const lookupCode = ref(String(route.query.lookupCode ?? orderStore.guestLookupCode));
const phone = ref(String(route.query.phone ?? orderStore.guestPhone));
const guestToken = ref(String(route.query.guestToken ?? orderStore.guestToken));
const errorMessage = ref('');
const isLoading = ref(false);
const itemDetailsOpen = ref(true);
const notificationsOpen = ref(true);
const loadedLookupCode = ref('');
const loadedPhone = ref('');
const loadedGuestToken = ref('');
const isLoadingMemberOrders = ref(false);

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
const lookupButtonLabel = computed(() => {
  if (isLoading.value) return '查詢中...';
  return orderStore.currentOrder ? '查詢其他訂單' : '查詢並顯示訂單狀態';
});
const memberTrackingOrders = computed(() => orderStore.myOrders.slice(0, 5));

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

const currentStepIndex = computed(() => stepIndex(currentStatus.value ?? 'pending'));

const isReady = computed(() => currentStatus.value === 'ready');

const stepperContainerClass = computed(() => {
  if (isReady.value) return 'border-emerald-400 bg-emerald-50';
  if (currentStatus.value === 'completed') return 'border-amber-300 bg-amber-50';
  return 'border-stone-300 bg-white';
});

const activeLineClass = computed(() =>
  isReady.value || currentStatus.value === 'completed' ? 'bg-emerald-500' : 'bg-amber-900'
);

function circleClass(status: string) {
  const idx = stepIndex(status);
  const cur = currentStepIndex.value;
  if (isReady.value || currentStatus.value === 'completed') {
    if (idx < cur) return 'bg-emerald-600 text-white';
    if (status === currentStatus.value)
      return isReady.value
        ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
        : 'bg-emerald-600 text-white';
  } else {
    if (idx < cur) return 'bg-amber-900 text-white';
    if (status === currentStatus.value) return 'bg-amber-900 text-white ring-4 ring-amber-200';
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
  if (currentStatus.value === 'ready')     return '您的餐點已完成，請到櫃檯取餐。';
  if (currentStatus.value === 'completed') return '謝謝您，這筆訂單已完成。';
  if (currentStatus.value === 'preparing') return '店員正在準備您的餐點，請稍候。';
  if (currentStatus.value === 'accepted')  return '店家已收到訂單，即將開始製作。';
  return '訂單已送出，等待店家確認中。';
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
    pending: '待處理',
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
  return order.guestInfo?.phone || '會員訂單未留手機';
}

function fillMemberOrder(order: Order) {
  if (!order.orderLookupCode || !order.guestInfo?.phone) return;
  lookupCode.value = order.orderLookupCode;
  phone.value = order.guestInfo.phone;
  guestToken.value = '';
}

function selectMemberOrder(order: Order) {
  orderStore.currentOrder = order;
  notificationStore.items = [];
  loadedLookupCode.value = order.orderLookupCode ?? '';
  loadedPhone.value = order.guestInfo?.phone ?? '';
  loadedGuestToken.value = '';
  if (order.orderLookupCode) lookupCode.value = order.orderLookupCode;
  if (order.guestInfo?.phone) phone.value = order.guestInfo.phone;
  guestToken.value = '';
}

async function loadMemberTrackingOrders() {
  if (authStore.user?.role !== 'user') return;
  isLoadingMemberOrders.value = true;
  try {
    await orderStore.loadMyOrders();
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
      orderStore.clearGuestTrackingSession();
      guestToken.value = '';
      loadedLookupCode.value = '';
      loadedPhone.value = '';
      loadedGuestToken.value = '';
      errorMessage.value = '無此訂單，請確認查詢碼與手機號碼是否正確。';
    } else {
      errorMessage.value = '無法載入訪客訂單，請稍後再試。';
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
