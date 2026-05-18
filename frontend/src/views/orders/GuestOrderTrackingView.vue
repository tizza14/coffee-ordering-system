<template>
  <section
    class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6 lg:grid-cols-2"
  >
    <!-- 左欄：訪客訂單追蹤 -->
    <div class="grid content-start gap-4">
      <header>
        <h1 class="m-0 text-2xl font-bold text-amber-950">訪客訂單追蹤</h1>
        <p class="m-0 text-stone-600">輸入查詢碼與手機號碼查詢訂單狀態。</p>
      </header>

      <form
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-5"
        @submit.prevent="load"
      >
        <label class="grid gap-1.5 font-semibold">
          訂單查詢碼
          <input
            v-model="lookupCode"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            required
          />
        </label>
        <label class="grid gap-1.5 font-semibold">
          手機號碼
          <input
            v-model="phone"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            pattern="09[0-9]{8}"
          />
        </label>
        <p class="m-0 text-xs text-stone-500">手機號碼或付款後收到的 Guest Token 擇一輸入即可。</p>
        <button
          class="min-h-10 cursor-pointer rounded-md bg-amber-900 px-4 font-bold text-white disabled:opacity-60"
          type="submit"
          :disabled="isLoading"
        >
          {{ isLoading ? '查詢中...' : '查詢訂單' }}
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
          <span>通知紀錄</span>
          <span class="text-sm text-stone-500">{{ notificationsOpen ? '收合' : '展開' }}</span>
        </button>
        <ul
          v-if="notificationsOpen"
          class="grid list-none gap-2 border-t border-stone-200 p-3"
        >
          <li
            v-for="notification in notificationStore.items"
            :key="notification.id"
            class="grid gap-1 rounded-lg border border-stone-200 bg-white p-3"
          >
            <strong class="text-amber-950">{{ notification.message }}</strong>
            <span class="text-sm text-stone-500">{{ formatTime(notification.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- 右欄：訂單已完成 -->
    <div class="grid content-start gap-4">
      <header>
        <h2 class="m-0 text-2xl font-bold text-amber-950">訂單已完成</h2>
        <p class="m-0 text-stone-600">查詢後即時顯示訂單狀態與明細。</p>
      </header>

      <div
        v-if="!orderStore.currentOrder"
        class="grid min-h-40 place-items-center rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500"
      >
        <div>
          <p class="m-0 text-2xl">📋</p>
          <p class="m-0 mt-2 font-semibold">尚未查詢訂單</p>
          <p class="m-0 text-sm">請在左側輸入查詢碼查詢。</p>
        </div>
      </div>

      <template v-else>
        <!-- 狀態卡 -->
        <div class="rounded-lg border p-5" :class="statusPanelClass">
          <p class="m-0 text-sm font-extrabold uppercase tracking-wide opacity-70">
            訂單 {{ orderStore.currentOrder.orderLookupCode }}
          </p>
          <h3 class="m-0 mt-1 text-3xl font-extrabold">{{ statusLabel }}</h3>
          <p class="m-0 mt-1 font-semibold">{{ statusMessage }}</p>
        </div>

        <!-- 最新通知 -->
        <div
          v-if="latestNotification"
          class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <p class="m-0 text-xs font-extrabold uppercase tracking-wide">最新通知</p>
          <p class="m-0 mt-1 font-bold">{{ latestNotification.message }}</p>
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

const statusLabel = computed(() => {
  if (currentStatus.value === 'ready') return '餐點已完成，請取餐';
  if (currentStatus.value === 'completed') return '訂單已完成';
  if (currentStatus.value === 'preparing') return '餐點製作中';
  if (currentStatus.value === 'accepted') return '店家已接單';
  if (currentStatus.value === 'cancelled') return '訂單已取消';
  return '訂單已送出';
});

const statusMessage = computed(() => {
  if (currentStatus.value === 'ready') return '您的餐點已經做好，請到櫃檯取餐。';
  if (currentStatus.value === 'completed') return '謝謝您，這筆訂單已完成。';
  if (currentStatus.value === 'preparing') return '店員正在準備您的餐點。';
  if (currentStatus.value === 'accepted') return '店家已收到訂單，會開始安排製作。';
  if (currentStatus.value === 'cancelled') return '這筆訂單已取消。';
  return '訂單狀態更新時，這裡會同步顯示。';
});

const statusPanelClass = computed(() => {
  if (currentStatus.value === 'ready') return 'border-emerald-400 bg-emerald-50 text-emerald-950';
  if (currentStatus.value === 'completed') return 'border-amber-400 bg-amber-50 text-amber-950';
  if (currentStatus.value === 'cancelled') return 'border-red-300 bg-red-50 text-red-900';
  return 'border-sky-300 bg-sky-50 text-sky-950';
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
  try {
    const order = await orderStore.loadGuestOrder(
      lookupCode.value,
      phone.value || undefined,
      guestToken.value || undefined
    );
    await notificationStore.loadGuestNotifications(
      lookupCode.value,
      phone.value || undefined,
      guestToken.value || undefined
    );
    if (guestToken.value) {
      socketStore.connect({ orderLookupCode: lookupCode.value, guestToken: guestToken.value });
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
