<template>
  <section class="grid min-h-[calc(100vh-64px)] gap-5 bg-stone-100 p-4 sm:p-6">
    <header
      class="flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-slate-800">Staff Orders</h1>
        <p class="m-0 text-slate-600">Paid orders waiting for preparation.</p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-slate-800"
        type="button"
        @click="loadDashboard"
      >
        Refresh
      </button>
    </header>

    <section
      v-if="orderStore.todaySummary"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          Today's Revenue
        </p>
        <strong class="text-2xl text-slate-800">
          NT$ {{ orderStore.todaySummary.paidRevenue }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          Paid Orders
        </p>
        <strong class="text-2xl text-slate-800">
          {{ orderStore.todaySummary.paidOrders }} /
          {{ orderStore.todaySummary.totalOrders }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          Items Sold
        </p>
        <strong class="text-2xl text-slate-800">
          {{ orderStore.todaySummary.itemQuantity }}
        </strong>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <p class="m-0 text-sm font-bold uppercase text-slate-500">
          Avg. Paid Order
        </p>
        <strong class="text-2xl text-slate-800">
          NT$ {{ orderStore.todaySummary.averagePaidOrderValue }}
        </strong>
      </article>
    </section>

    <section
      v-if="orderStore.todaySummary"
      class="grid gap-3 lg:grid-cols-2"
    >
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <h2 class="m-0 text-lg font-bold text-slate-800">Customer Mix</h2>
        <p class="m-0 text-slate-700">
          Guests: {{ orderStore.todaySummary.guestOrders }} / Members:
          {{ orderStore.todaySummary.memberOrders }}
        </p>
      </article>
      <article class="rounded-lg border border-stone-300 bg-white p-4">
        <h2 class="m-0 text-lg font-bold text-slate-800">Order Status</h2>
        <p class="m-0 text-slate-700">
          Pending: {{ orderStore.todaySummary.statusCounts.pending }} /
          Preparing: {{ orderStore.todaySummary.statusCounts.preparing }} /
          Ready: {{ orderStore.todaySummary.statusCounts.ready }} /
          Completed: {{ orderStore.todaySummary.statusCounts.completed }}
        </p>
      </article>
    </section>

    <p
      v-if="isLoading"
      class="m-0 rounded-lg border border-stone-300 bg-white p-4"
    >
      Loading orders...
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
      No paid pending orders.
    </p>

    <ul v-else class="grid list-none gap-3 p-0">
      <li
        v-for="order in orderStore.staffOrders"
        :key="order.id"
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
      >
        <div
          class="flex items-start justify-between gap-4 max-[760px]:flex-col"
        >
          <div>
            <h2 class="m-0 text-xl font-bold text-slate-800">
              Order {{ order.orderLookupCode || order.id.slice(-6) }}
            </h2>
            <p class="m-0 text-slate-600">
              {{ order.guestInfo?.name || order.userId || 'Member order' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full bg-stone-200 px-2 py-1 text-xs font-extrabold uppercase text-slate-700"
            >
              {{ order.paymentStatus }}
            </span>
            <span
              class="rounded-full bg-slate-800 px-2 py-1 text-xs font-extrabold uppercase text-white"
            >
              {{ order.status }}
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
              {{ status }}
            </button>
          </div>
        </footer>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
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

function getNextStatuses(status: Order['status']) {
  return nextStatusesByStatus[status];
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
    errorMessage.value = 'Unable to load staff orders.';
  } finally {
    isLoading.value = false;
  }
}

async function updateStatus(
  orderId: string,
  status: OrderTransitionStatus
) {
  isUpdating.value = orderId;
  errorMessage.value = '';
  try {
    await orderStore.updateStaffOrderStatus(orderId, status);
    await orderStore.loadTodaySummary();
  } catch {
    errorMessage.value = 'Unable to update order status.';
  } finally {
    isUpdating.value = '';
  }
}

onMounted(loadDashboard);
</script>
