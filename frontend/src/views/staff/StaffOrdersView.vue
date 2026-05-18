<template>
  <section class="grid min-h-[calc(100vh-64px)] gap-5 bg-amber-50 p-4 sm:p-6">
    <header
      class="flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">員工訂單</h1>
        <p class="m-0 text-stone-600">查看已付款訂單並進行後續處理。</p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-amber-950"
        type="button"
        @click="loadDashboard"
      >
        重新整理
      </button>
    </header>

    <section
      v-if="orderStore.todaySummary"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-stone-500">
          今日營收
        </p>
        <strong class="text-2xl text-amber-950">
          NT$ {{ orderStore.todaySummary.paidRevenue }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-stone-500">
          已付款訂單
        </p>
        <strong class="text-2xl text-amber-950">
          {{ orderStore.todaySummary.paidOrders }} /
          {{ orderStore.todaySummary.totalOrders }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-stone-500">
          已售品項
        </p>
        <strong class="text-2xl text-amber-950">
          {{ orderStore.todaySummary.itemQuantity }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-stone-500">
          平均單筆金額
        </p>
        <strong class="text-2xl text-amber-950">
          NT$ {{ orderStore.todaySummary.averagePaidOrderValue }}
        </strong>
      </article>
    </section>

    <section v-if="orderStore.todaySummary" class="grid gap-3 lg:grid-cols-2">
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <h2 class="m-0 text-lg font-bold text-amber-950">客群比例</h2>
        <p class="m-0 text-amber-900">
          訪客：{{ orderStore.todaySummary.guestOrders }} / 會員：
          {{ orderStore.todaySummary.memberOrders }}
        </p>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <h2 class="m-0 text-lg font-bold text-amber-950">訂單狀態</h2>
        <p class="m-0 text-amber-900">
          待處理：{{ orderStore.todaySummary.statusCounts.pending }} /
          製作中：{{ orderStore.todaySummary.statusCounts.preparing }} /
          可取餐：{{ orderStore.todaySummary.statusCounts.ready }} /
          已完成：{{ orderStore.todaySummary.statusCounts.completed }}
        </p>
      </article>
    </section>

    <section
      v-if="orderStore.todaySummary"
      class="rounded-lg border border-stone-300 bg-white p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="m-0 text-lg font-bold text-amber-950">今日銷售品項</h2>
        <span class="text-sm font-bold text-stone-500">
          已售 {{ orderStore.todaySummary.itemQuantity }} 件
        </span>
      </div>
      <p v-if="soldItems.length === 0" class="m-0 pt-3 text-stone-600">
        尚無已付款品項。
      </p>
      <ul v-else class="grid list-none gap-2 p-0">
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
    </section>

    <template v-if="isLoading">
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="animate-pulse rounded-lg border border-stone-200 bg-white p-4"
        >
          <div class="mb-2 h-3 w-20 rounded bg-stone-200"></div>
          <div class="h-7 w-28 rounded bg-stone-200"></div>
        </div>
      </section>
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
            <div class="flex gap-2">
              <div class="h-6 w-16 rounded-full bg-stone-200"></div>
              <div class="h-6 w-16 rounded-full bg-stone-200"></div>
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="h-3 w-full rounded bg-stone-200"></div>
            <div class="h-3 w-3/4 rounded bg-stone-200"></div>
          </div>
          <div class="flex items-center justify-between border-t border-stone-200 pt-3">
            <div class="h-4 w-20 rounded bg-stone-200"></div>
            <div class="h-9 w-16 rounded bg-stone-200"></div>
          </div>
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
      v-else-if="orderStore.staffOrders.length === 0"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4 text-stone-600"
    >
      目前沒有已付款待處理訂單。
    </p>

    <ul v-else class="grid list-none gap-3 p-0">
      <li
        v-for="order in orderStore.staffOrders"
        :key="order.id"
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-4 max-[760px]:flex-col">
          <div>
            <h2 class="m-0 text-xl font-bold text-amber-950">
              訂單 {{ order.orderLookupCode || order.id.slice(-6) }}
            </h2>
            <p class="m-0 text-stone-600">
              {{ order.guestInfo?.name || order.userId || '會員訂單' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full bg-stone-200 px-2 py-1 text-xs font-extrabold uppercase text-amber-900"
            >
              {{ paymentStatusLabel(order.paymentStatus) }}
            </span>
            <span
              class="rounded-full bg-amber-900 px-2 py-1 text-xs font-extrabold uppercase text-white"
            >
              {{ statusLabel(order.status) }}
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

        <footer
          class="flex items-center justify-between gap-4 border-t border-stone-200 pt-3 max-[760px]:flex-col max-[760px]:items-stretch"
        >
          <strong>NT$ {{ order.totalAmount }}</strong>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="status in getNextStatuses(order.status)"
              :key="status"
              class="min-h-9 rounded-md border border-amber-900 bg-amber-900 px-3 font-bold text-white disabled:opacity-60"
              type="button"
              :disabled="isUpdating === order.id"
              @click="updateStatus(order.id, status)"
            >
              {{ statusButtonLabel(status) }}
            </button>
          </div>
        </footer>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useOrderStore } from '../../stores/order.store';
import type { Order } from '../../api/order.api';
import { extractApiError } from '../../api/http';
import { useToastStore } from '../../stores/toast.store';

type OrderTransitionStatus = Exclude<Order['status'], 'pending'>;

const nextStatusesByStatus = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: []
} as const satisfies Record<Order['status'], readonly OrderTransitionStatus[]>;
const orderStore = useOrderStore();
const toastStore = useToastStore();
const soldItems = computed(() => orderStore.todaySummary?.soldItems ?? []);
const isLoading = ref(false);
const isUpdating = ref('');
const errorMessage = ref('');

function getNextStatuses(status: Order['status']) {
  return nextStatusesByStatus[status];
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
    preparing: '製作中',
    ready: '可取餐',
    completed: '完成',
    cancelled: '取消'
  };
  return labels[status];
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

onMounted(loadDashboard);
</script>
