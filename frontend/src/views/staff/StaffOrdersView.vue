<template>
  <section class="grid min-h-[calc(100vh-64px)] gap-5 bg-stone-100 p-4 sm:p-6">
    <header
      class="flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-slate-800">員工訂單</h1>
        <p class="m-0 text-slate-600">查看已付款訂單並進行後續處理。</p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-slate-800"
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
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          今日營收
        </p>
        <strong class="text-2xl text-slate-800">
          NT$ {{ orderStore.todaySummary.paidRevenue }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          已付款訂單
        </p>
        <strong class="text-2xl text-slate-800">
          {{ orderStore.todaySummary.paidOrders }} /
          {{ orderStore.todaySummary.totalOrders }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          已售品項
        </p>
        <strong class="text-2xl text-slate-800">
          {{ orderStore.todaySummary.itemQuantity }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          平均單筆金額
        </p>
        <strong class="text-2xl text-slate-800">
          NT$ {{ orderStore.todaySummary.averagePaidOrderValue }}
        </strong>
      </article>
    </section>

    <section v-if="orderStore.todaySummary" class="grid gap-3 lg:grid-cols-2">
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <h2 class="m-0 text-lg font-bold text-slate-800">客群比例</h2>
        <p class="m-0 text-slate-700">
          訪客：{{ orderStore.todaySummary.guestOrders }} / 會員：
          {{ orderStore.todaySummary.memberOrders }}
        </p>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <h2 class="m-0 text-lg font-bold text-slate-800">訂單狀態</h2>
        <p class="m-0 text-slate-700">
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
        <h2 class="m-0 text-lg font-bold text-slate-800">今日銷售品項</h2>
        <span class="text-sm font-bold text-slate-500">
          已售 {{ orderStore.todaySummary.itemQuantity }} 件
        </span>
      </div>
      <p v-if="soldItems.length === 0" class="m-0 pt-3 text-slate-600">
        尚無已付款品項。
      </p>
      <ul v-else class="grid list-none gap-2 p-0">
        <li
          v-for="item in soldItems"
          :key="item.productId"
          class="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-stone-200 pt-2 text-slate-800"
        >
          <strong>{{ item.name }}</strong>
          <span class="font-bold">x {{ item.quantity }}</span>
          <span>NT$ {{ item.revenue }}</span>
        </li>
      </ul>
    </section>

    <p
      v-if="isLoading"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4"
    >
      載入訂單中...
    </p>
    <p
      v-else-if="errorMessage"
      class="m-0 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="orderStore.staffOrders.length === 0"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4 text-slate-600"
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
            <h2 class="m-0 text-xl font-bold text-slate-800">
              訂單 {{ order.orderLookupCode || order.id.slice(-6) }}
            </h2>
            <p class="m-0 text-slate-600">
              {{ order.guestInfo?.name || order.userId || '會員訂單' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full bg-stone-200 px-2 py-1 text-xs font-extrabold uppercase text-slate-700"
            >
              {{ paymentStatusLabel(order.paymentStatus) }}
            </span>
            <span
              class="rounded-full bg-slate-800 px-2 py-1 text-xs font-extrabold uppercase text-white"
            >
              {{ statusLabel(order.status) }}
            </span>
          </div>
        </div>

        <ul class="grid list-none gap-1 p-0 text-slate-700">
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
              class="min-h-9 rounded-md border border-slate-800 bg-slate-800 px-3 font-bold text-white disabled:opacity-60"
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
const isLoading = ref(false);
const isUpdating = ref('');
const errorMessage = ref('');
const soldItems = computed(() => orderStore.todaySummary?.soldItems ?? []);

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
  } catch {
    errorMessage.value = '無法載入員工訂單。';
  } finally {
    isLoading.value = false;
  }
}

async function updateStatus(orderId: string, status: OrderTransitionStatus) {
  isUpdating.value = orderId;
  errorMessage.value = '';
  try {
    await orderStore.updateStaffOrderStatus(orderId, status);
    await orderStore.loadTodaySummary();
  } catch {
    errorMessage.value = '無法更新訂單狀態。';
  } finally {
    isUpdating.value = '';
  }
}

onMounted(loadDashboard);
</script>
