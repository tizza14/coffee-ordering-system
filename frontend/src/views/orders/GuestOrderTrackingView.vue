<template>
  <section class="grid gap-4 bg-stone-100 p-4 sm:p-6">
    <form
      class="grid max-w-xl gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
      @submit.prevent="load"
    >
      <h1 class="m-0 text-2xl font-bold">訪客訂單追蹤</h1>
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
        />
      </label>
      <button
        class="min-h-10 rounded-md bg-slate-800 px-4 font-bold text-white"
      >
        查詢訂單
      </button>
      <p v-if="errorMessage" class="m-0 font-semibold text-red-700">
        {{ errorMessage }}
      </p>
    </form>

    <article
      v-if="orderStore.currentOrder"
      class="grid gap-4 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
    >
      <div class="rounded-lg border p-4" :class="statusPanelClass">
        <p class="m-0 text-sm font-extrabold uppercase">
          訂單 {{ orderStore.currentOrder.orderLookupCode }}
        </p>
        <h2 class="m-0 text-3xl font-extrabold">
          {{ statusLabel }}
        </h2>
        <p class="m-0 font-semibold">
          {{ statusMessage }}
        </p>
      </div>

      <div
        v-if="latestNotification"
        class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
      >
        <p class="m-0 text-sm font-extrabold uppercase">最新通知</p>
        <p class="m-0 text-lg font-bold">{{ latestNotification.message }}</p>
      </div>

      <section class="rounded-lg border border-stone-300">
        <button
          class="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg bg-white px-4 text-left font-bold text-slate-800"
          type="button"
          :aria-expanded="itemDetailsOpen"
          @click="itemDetailsOpen = !itemDetailsOpen"
        >
          <span>點餐明細</span>
          <span class="text-sm text-slate-500">
            {{ itemDetailsOpen ? '收合' : '展開' }}
          </span>
        </button>

        <div
          v-if="itemDetailsOpen"
          class="grid gap-3 border-t border-stone-200 p-4"
        >
          <ul class="grid list-none gap-2 p-0">
            <li
              v-for="item in orderStore.currentOrder.items"
              :key="item.productId"
              class="grid grid-cols-[1fr_auto] gap-3 text-slate-800"
            >
              <span>{{ item.name }} x {{ item.quantity }}</span>
              <strong>NT$ {{ item.price * item.quantity }}</strong>
            </li>
          </ul>
          <p class="m-0 border-t border-stone-200 pt-3 text-right font-extrabold">
            總金額：NT$ {{ orderStore.currentOrder.totalAmount }}
          </p>
        </div>
      </section>
    </article>

    <section v-if="notificationStore.items.length > 0" class="grid gap-2">
      <h2 class="m-0 text-xl font-bold">通知紀錄</h2>
      <ul class="grid list-none gap-2 p-0">
        <li
          v-for="notification in notificationStore.items"
          :key="notification.id"
          class="grid gap-1 rounded-lg border border-stone-300 bg-white p-3"
        >
          <strong>{{ notification.message }}</strong>
          <span class="text-sm text-slate-500">
            {{ formatTime(notification.createdAt) }}
          </span>
        </li>
      </ul>
    </section>
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
const itemDetailsOpen = ref(false);
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
  if (currentStatus.value === 'ready') {
    return '您的餐點已經做好，請到櫃檯取餐。';
  }
  if (currentStatus.value === 'completed') return '謝謝您，這筆訂單已完成。';
  if (currentStatus.value === 'preparing') return '店員正在準備您的餐點。';
  if (currentStatus.value === 'accepted') return '店家已收到訂單，會開始安排製作。';
  if (currentStatus.value === 'cancelled') return '這筆訂單已取消。';
  return '訂單狀態更新時，這裡會同步顯示。';
});
const statusPanelClass = computed(() => {
  if (currentStatus.value === 'ready') {
    return 'border-emerald-400 bg-emerald-50 text-emerald-950';
  }
  if (currentStatus.value === 'completed') {
    return 'border-slate-400 bg-slate-100 text-slate-900';
  }
  if (currentStatus.value === 'cancelled') {
    return 'border-red-300 bg-red-50 text-red-900';
  }
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
      socketStore.connect({
        orderLookupCode: lookupCode.value,
        guestToken: guestToken.value
      });
      socketStore.joinOrderRoom(order.id);
    }
  } catch {
    errorMessage.value = '無法載入訪客訂單。';
  }
}

onMounted(() => {
  if (lookupCode.value && (guestToken.value || phone.value)) {
    void load();
  }
});
</script>
