<template>
  <section class="grid gap-4 bg-stone-100 p-4 sm:p-6">
    <form
      class="grid max-w-xl gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
      @submit.prevent="load"
    >
      <h1 class="m-0 text-2xl font-bold">Guest Order Tracking</h1>
      <label class="grid gap-1.5 font-semibold">
        Lookup code
        <input
          v-model="lookupCode"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          required
        />
      </label>
      <label class="grid gap-1.5 font-semibold">
        Phone
        <input
          v-model="phone"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
        />
      </label>
      <label class="grid gap-1.5 font-semibold">
        Guest token
        <input
          v-model="guestToken"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
        />
      </label>
      <button
        class="min-h-10 rounded-md bg-slate-800 px-4 font-bold text-white"
      >
        Load order
      </button>
      <p v-if="errorMessage" class="m-0 font-semibold text-red-700">
        {{ errorMessage }}
      </p>
    </form>

    <article
      v-if="orderStore.currentOrder"
      class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
    >
      <h2 class="m-0 text-xl font-bold">
        {{ orderStore.currentOrder.orderLookupCode }}
      </h2>
      <p class="m-0">
        {{ liveStatus || orderStore.currentOrder.status }} /
        {{ orderStore.currentOrder.paymentStatus }}
      </p>
      <p class="m-0">Total: NT$ {{ orderStore.currentOrder.totalAmount }}</p>
    </article>

    <section v-if="notificationStore.items.length > 0" class="grid gap-2">
      <h2 class="m-0 text-xl font-bold">Notifications</h2>
      <ul class="grid list-none gap-2 p-0">
        <li
          v-for="notification in notificationStore.items"
          :key="notification.id"
          class="rounded-lg border border-stone-300 bg-white p-3"
        >
          {{ notification.message }}
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
const liveStatus = computed(() => socketStore.latestOrderUpdate?.status);

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
    errorMessage.value = 'Unable to load guest order.';
  }
}

onMounted(() => {
  if (lookupCode.value && (guestToken.value || phone.value)) {
    void load();
  }
});
</script>
