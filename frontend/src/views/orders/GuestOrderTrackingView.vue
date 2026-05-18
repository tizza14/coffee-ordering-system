<template>
  <section
    class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6 lg:grid-cols-2"
  >
    <!-- 左欄：訪客訂單追蹤 -->
    <div class="grid content-start gap-4">
      <header>
        <h1 class="m-0 text-2xl font-bold text-amber-950">訪客訂單追蹤</h1>
        <p class="m-0 text-stone-600">輸入查詢碼與手機號碼，立即顯示訂單進度與點餐明細。</p>
      </header>

      <form
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-5"
        @submit.prevent="load"
      >
        <div class="rounded-md border border-amber-100 bg-amber-50 p-3">
          <p class="m-0 text-sm font-bold text-amber-950">查詢後會顯示</p>
          <ul class="m-0 mt-2 grid list-disc gap-1 pl-5 text-sm text-stone-700">
            <li>目前訂單狀態與取餐進度</li>
            <li>點餐明細與總金額</li>
            <li>店家更新狀態後的通知紀錄</li>
          </ul>
        </div>

        <label class="grid gap-1.5 font-semibold">
          訂單查詢碼
          <input
            v-model="lookupCode"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            placeholder="例如 DEMO0001"
            required
          />
        </label>
        <label class="grid gap-1.5 font-semibold">
          手機號碼
          <input
            v-model="phone"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            pattern="09[0-9]{8}"
            placeholder="例如 0912345678"
          />
        </label>
        <p class="m-0 text-xs text-stone-500">
          查詢碼在付款完成頁顯示；手機號碼需與下單時填寫的號碼相同。
        </p>
        <button
          class="min-h-11 cursor-pointer rounded-md bg-amber-900 px-4 font-bold text-white disabled:opacity-60"
          type="submit"
          :disabled="isLoading"
        >
          {{ isLoading ? '查詢中...' : '查詢並顯示訂單狀態' }}
        </button>
        <p v-if="errorMessage" class="m-0 font-semibold text-red-700">
          {{ errorMessage }}
        </p>
      </form>

      <!-- 通知紀錄 -->
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

    <!-- 右欄：訂單狀態 -->
    <div class="grid content-start gap-4">
      <header>
        <h2 class="m-0 text-2xl font-bold text-amber-950">訂單狀態</h2>
        <p class="m-0 text-stone-600">查詢後即時顯示訂單進度與明細。</p>
      </header>

      <div
        v-if="!orderStore.currentOrder"
        class="grid min-h-40 place-items-center rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500"
      >
        <div>
          <p class="m-0 text-2xl">📋</p>
          <p class="m-0 mt-2 font-semibold">查詢結果會顯示在這裡</p>
          <p class="m-0 text-sm">送出查詢後，這裡會顯示進度條、餐點明細與通知紀錄。</p>
        </div>
      </div>

      <template v-else>
        <!-- 狀態步驟條 -->
        <div
          class="rounded-lg border p-5 transition-colors"
          :class="stepperContainerClass"
        >
          <p class="m-0 mb-4 text-xs font-bold uppercase tracking-widest opacity-60">
            訂單 {{ orderStore.currentOrder.orderLookupCode }}
          </p>

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
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useNotificationStore } from '../../stores/notification.store';
import { useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';

const route = useRoute();
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

const currentStatus = computed(
  () => socketStore.latestOrderUpdate?.status ?? orderStore.currentOrder?.status
);
const latestNotification = computed(() => notificationStore.items[0]);

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

async function load() {
  errorMessage.value = '';
  isLoading.value = true;
  const trackingLookupCode = lookupCode.value.trim().toUpperCase();
  const trackingPhone = phone.value.trim();
  const trackingGuestToken = guestToken.value.trim();
  lookupCode.value = trackingLookupCode;
  phone.value = trackingPhone;
  guestToken.value = trackingGuestToken;
  try {
    const order = await orderStore.loadGuestOrder(
      trackingLookupCode,
      trackingPhone || undefined,
      trackingGuestToken || undefined
    );

    try {
      await notificationStore.loadGuestNotifications(
        trackingLookupCode,
        trackingPhone || undefined,
        trackingGuestToken || undefined
      );
    } catch {
      notificationStore.items = [];
    }

    if (trackingGuestToken) {
      socketStore.connect({
        orderLookupCode: trackingLookupCode,
        guestToken: trackingGuestToken
      });
      socketStore.joinOrderRoom(order.id);
    }
  } catch {
    errorMessage.value = '無法載入訪客訂單，請確認查詢碼與手機號碼是否正確。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  if (lookupCode.value && (guestToken.value || phone.value)) {
    void load();
  }
});
</script>
