<template>
  <section
    class="grid min-h-[calc(100vh-64px)] place-items-center bg-stone-100 p-4 sm:p-6"
  >
    <article
      class="grid w-full max-w-lg gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
    >
      <h1 class="m-0 text-2xl font-bold">Line Pay Confirm</h1>
      <p class="m-0">
        {{ message }}
      </p>
      <RouterLink class="font-bold text-slate-800" to="/products">
        Back to products
      </RouterLink>
      <RouterLink
        v-if="trackingQuery.lookupCode"
        class="font-bold text-slate-800"
        :to="{ path: '/orders/guest', query: trackingQuery }"
      >
        Track this order
      </RouterLink>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { useOrderStore } from '../../stores/order.store';
import { usePaymentStore } from '../../stores/payment.store';

const route = useRoute();
const orderStore = useOrderStore();
const paymentStore = usePaymentStore();
const message = ref('Confirming payment...');
const lookupCode = ref('');
const guestToken = ref('');

const trackingQuery = computed(() => ({
  lookupCode: lookupCode.value
}));

onMounted(async () => {
  const orderId = String(route.query.orderId ?? '');
  const transactionId = String(route.query.transactionId ?? '');
  guestToken.value = String(route.query.guestToken ?? orderStore.guestToken ?? '');
  lookupCode.value = String(
    route.query.lookupCode ?? orderStore.guestLookupCode ?? ''
  );

  if (lookupCode.value && guestToken.value) {
    orderStore.setGuestTrackingSession({
      lookupCode: lookupCode.value,
      guestToken: guestToken.value,
      phone: orderStore.guestPhone || undefined
    });
  }

  if (!orderId || !transactionId) {
    message.value = 'Missing payment confirmation parameters.';
    return;
  }

  try {
    await paymentStore.confirmLinePay(
      orderId,
      transactionId,
      guestToken.value || undefined
    );
    message.value = 'Payment confirmed.';
  } catch {
    message.value = 'Unable to confirm payment.';
  }
});
</script>
