<template>
  <section class="grid min-h-[calc(100vh-64px)] content-start gap-5 bg-amber-50 p-4 sm:p-6">
    <header>
      <h1 class="m-0 text-2xl font-bold text-amber-950">點餐紀錄</h1>
      <p class="m-0 text-stone-600">查看你最近的訂單狀態、付款結果與點餐明細。</p>
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
    <ul v-else class="grid list-none gap-3 p-0">
      <li
        v-for="order in orderStore.myOrders"
        :key="order.id"
        class="grid gap-0 rounded-lg border border-stone-300 bg-white overflow-hidden"
      >
        <!-- 訂單標頭 -->
        <button
          class="flex w-full items-start justify-between gap-3 p-4 text-left"
          type="button"
          :aria-expanded="openOrders.has(order.id)"
          @click="toggleOrder(order.id)"
        >
          <div class="grid gap-1 min-w-0">
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
            <span class="text-xs text-stone-400">{{ formatDate(order.createdAt) }}</span>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <span :class="paymentBadgeClass(order.paymentStatus)">
              {{ paymentLabel(order.paymentStatus) }}
            </span>
            <span :class="statusBadgeClass(liveStatus(order))">
              {{ statusLabel(liveStatus(order)) }}
            </span>
            <span class="text-xs text-stone-400">{{ openOrders.has(order.id) ? '▲' : '▼' }}</span>
          </div>
        </button>

        <!-- 摘要列（收合狀態顯示） -->
        <div
          v-if="!openOrders.has(order.id)"
          class="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-4 py-2 text-sm text-stone-500"
        >
          <span>
            {{ order.items.map(i => `${i.name} x${i.quantity}`).join('、') }}
          </span>
          <strong class="text-amber-950">NT$ {{ order.totalAmount }}</strong>
        </div>

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
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useOrderStore } from '../../stores/order.store';
import { useSocketStore } from '../../stores/socket.store';
import type { Order } from '../../api/order.api';

const orderStore = useOrderStore();
const socketStore = useSocketStore();

const isLoading = ref(false);
const errorMessage = ref('');
const openOrders = ref(new Set<string>());

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

async function loadOrders() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await orderStore.loadMyOrders();
  } catch {
    errorMessage.value = '無法載入點餐紀錄。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => void loadOrders());
</script>
