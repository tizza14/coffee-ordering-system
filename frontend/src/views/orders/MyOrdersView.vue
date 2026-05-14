<template>
  <section class="grid gap-4 bg-stone-100 p-4 sm:p-6">
    <h1 class="m-0 text-2xl font-bold">My Orders</h1>
    <p v-if="orderStore.myOrders.length === 0" class="m-0 text-slate-600">
      No member orders yet.
    </p>
    <ul class="grid list-none gap-3 p-0">
      <li
        v-for="order in orderStore.myOrders"
        :key="order.id"
        class="rounded-lg border border-stone-300 bg-white p-4"
      >
        <div class="flex flex-wrap justify-between gap-3">
          <strong>{{ order.id }}</strong>
          <span>{{ order.paymentStatus }} / {{ order.status }}</span>
        </div>
        <p class="m-0 pt-2">Total: NT$ {{ order.totalAmount }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useOrderStore } from '../../stores/order.store';

const orderStore = useOrderStore();

onMounted(() => {
  void orderStore.loadMyOrders();
});
</script>
