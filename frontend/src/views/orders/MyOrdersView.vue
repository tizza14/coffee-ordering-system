<template>
  <section class="grid gap-4 bg-stone-100 p-4 sm:p-6">
    <header class="grid gap-2">
      <h1 class="m-0 text-2xl font-bold text-slate-800">點餐紀錄</h1>
      <p class="m-0 text-slate-600">
        查看你最近的訂單狀態、付款結果與點餐明細。
      </p>
    </header>

    <p v-if="isLoading" class="m-0 rounded-lg border border-stone-300 bg-white p-4">
      載入中...
    </p>

    <p
      v-else-if="errorMessage"
      class="m-0 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700"
    >
      {{ errorMessage }}
    </p>

    <p
      v-else-if="orderStore.myOrders.length === 0"
      class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4 text-slate-600"
    >
      <span>目前還沒有點餐紀錄。</span>
      <RouterLink class="font-bold text-slate-800" to="/products">
        前往商品頁開始點餐
      </RouterLink>
    </p>

    <ul v-else class="grid list-none gap-3 p-0">
      <li
        v-for="order in orderStore.myOrders"
        :key="order.id"
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="grid gap-1">
            <strong class="text-lg text-slate-800">
              訂單 {{ order.orderLookupCode || order.id.slice(-6) }}
            </strong>
            <span class="text-sm text-slate-500">
              {{ formatDate(order.createdAt) }}
            </span>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full bg-stone-200 px-2 py-1 text-xs font-extrabold uppercase text-slate-700"
            >
              {{ paymentLabel(order.paymentStatus) }}
            </span>
            <span
              class="rounded-full bg-slate-800 px-2 py-1 text-xs font-extrabold uppercase text-white"
            >
              {{ statusLabel(order.status) }}
            </span>
          </div>
        </div>

        <div class="grid gap-2 text-slate-700">
          <p class="m-0">
            總金額：<strong>NT$ {{ order.totalAmount }}</strong>
          </p>
          <p class="m-0">
            付款：{{ order.paymentStatus }} / 狀態：{{ order.status }}
          </p>
        </div>

        <details class="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <summary class="cursor-pointer font-bold text-slate-800">
            查看點餐明細
          </summary>
          <ul class="mt-3 grid list-none gap-2 p-0">
            <li
              v-for="item in order.items"
              :key="item.productId"
              class="flex items-center justify-between gap-3 border-b border-stone-200 pb-2 last:border-0 last:pb-0"
            >
              <span>{{ item.name }} x {{ item.quantity }}</span>
              <strong>NT$ {{ item.price * item.quantity }}</strong>
            </li>
          </ul>
        </details>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useOrderStore } from '../../stores/order.store';
import type { Order } from '../../api/order.api';

const orderStore = useOrderStore();
const isLoading = ref(false);
const errorMessage = ref('');

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
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

onMounted(() => {
  void loadOrders();
});
</script>
