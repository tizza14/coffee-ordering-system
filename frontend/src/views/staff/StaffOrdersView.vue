<template>
  <section class="grid min-h-[calc(100vh-64px)] gap-5 bg-stone-100 p-6">
    <header class="flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch">
      <div>
        <h1 class="m-0 text-2xl font-bold text-slate-800">
          Staff Orders
        </h1>
        <p class="m-0 text-slate-600">
          Paid orders waiting for preparation.
        </p>
      </div>
      <button
        class="min-h-10 rounded-md border border-stone-500 bg-white px-4 font-bold text-slate-800"
        type="button"
        @click="loadOrders"
      >
        Refresh
      </button>
    </header>

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

    <ul
      v-else
      class="grid list-none gap-3 p-0"
    >
      <li
        v-for="order in orderStore.staffOrders"
        :key="order.id"
        class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-4 max-[760px]:flex-col">
          <div>
            <h2 class="m-0 text-xl font-bold text-slate-800">
              Order {{ order.orderLookupCode || order.id.slice(-6) }}
            </h2>
            <p class="m-0 text-slate-600">
              {{ order.guestInfo?.name || order.userId || 'Member order' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full bg-stone-200 px-2 py-1 text-xs font-extrabold uppercase text-slate-700">
              {{ order.paymentStatus }}
            </span>
            <span class="rounded-full bg-slate-800 px-2 py-1 text-xs font-extrabold uppercase text-white">
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

        <footer class="flex items-center justify-between gap-4 border-t border-stone-200 pt-3 max-[760px]:flex-col max-[760px]:items-stretch">
          <strong>NT$ {{ order.totalAmount }}</strong>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="status in nextStatuses"
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

const nextStatuses = ['accepted', 'preparing', 'ready', 'completed', 'cancelled'] as const;
const orderStore = useOrderStore();
const isLoading = ref(false);
const isUpdating = ref('');
const errorMessage = ref('');

async function loadOrders() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await orderStore.loadStaffOrders();
  } catch {
    errorMessage.value = 'Unable to load staff orders.';
  } finally {
    isLoading.value = false;
  }
}

async function updateStatus(orderId: string, status: (typeof nextStatuses)[number]) {
  isUpdating.value = orderId;
  errorMessage.value = '';
  try {
    await orderStore.updateStaffOrderStatus(orderId, status);
  } catch {
    errorMessage.value = 'Unable to update order status.';
  } finally {
    isUpdating.value = '';
  }
}

onMounted(loadOrders);
</script>
