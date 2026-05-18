<template>
  <section
    class="grid min-h-[calc(100vh-64px)] place-items-center bg-amber-50 p-4 sm:p-6"
  >
    <article
      class="grid w-full max-w-lg gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
    >
      <h1 class="m-0 text-2xl font-bold">付款完成</h1>
      <p class="m-0">
        {{ message }}
      </p>
      <p v-if="lookupCode" class="m-0 text-sm text-stone-600">
        訂單查詢碼：{{ lookupCode }}
      </p>
      <div class="flex flex-wrap gap-3 pt-2">
        <RouterLink
          class="rounded-md bg-amber-900 px-4 py-2 font-bold text-white no-underline"
          to="/products"
        >
          回到商品頁
        </RouterLink>
        <RouterLink
          v-if="trackingQuery.lookupCode"
          class="rounded-md border border-amber-900 px-4 py-2 font-bold text-amber-950 no-underline"
          :to="{ path: '/orders/guest', query: trackingQuery }"
        >
          前往訂單追蹤
        </RouterLink>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useOrderStore } from '../../stores/order.store';
import { usePaymentStore } from '../../stores/payment.store';
import { useAuthStore } from '../../stores/auth.store';

const route = useRoute();
const orderStore = useOrderStore();
const paymentStore = usePaymentStore();
const authStore = useAuthStore();
const message = ref('正在確認付款...');
const lookupCode = ref('');
const guestToken = ref('');

const trackingQuery = computed(() => ({
  lookupCode: lookupCode.value,
  phone: orderStore.guestPhone || undefined,
  guestToken: guestToken.value || undefined
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
    message.value = '缺少付款確認參數。';
    return;
  }

  try {
    await paymentStore.confirmLinePay(
      orderId,
      transactionId,
      guestToken.value || undefined
    );
    message.value = '付款已完成。';
    void authStore.refreshUser();
  } catch {
    message.value = '無法確認付款。';
  }
});
</script>
