<template>
  <section
    class="grid min-h-[calc(100vh-64px)] place-items-center bg-amber-50 p-4 sm:p-6"
  >
    <article
      class="grid w-full max-w-lg gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
    >
      <h1 class="m-0 text-2xl font-bold">
        {{ isError ? '付款失敗' : '付款完成' }}
      </h1>
      <p class="m-0">{{ message }}</p>
      <p v-if="errorCode" class="m-0 text-sm text-red-600">
        錯誤代碼：{{ errorCode }}
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
        <RouterLink
          v-if="isError && orderId"
          class="rounded-md border border-stone-400 px-4 py-2 font-bold text-stone-700 no-underline"
          to="/orders/my"
        >
          查看我的訂單
        </RouterLink>
      </div>
      <p v-if="isError" class="m-0 text-xs text-stone-500">
        如問題持續發生，請聯繫店家並提供訂單查詢碼。
      </p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import axios from 'axios';
import { useOrderStore } from '../../stores/order.store';
import { usePaymentStore } from '../../stores/payment.store';
import { useAuthStore } from '../../stores/auth.store';

const route = useRoute();
const orderStore = useOrderStore();
const paymentStore = usePaymentStore();
const authStore = useAuthStore();

const message = ref('正在確認付款...');
const errorCode = ref('');
const isError = ref(false);
const lookupCode = ref('');
const guestToken = ref('');
const orderId = ref('');

const trackingQuery = computed(() => ({
  lookupCode: lookupCode.value,
  phone: orderStore.guestPhone || undefined,
  guestToken: guestToken.value || undefined
}));

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_AMOUNT_MISMATCH: '付款金額不符，請聯繫店家。',
  ORDER_ACCESS_DENIED: '無法驗證訂單身份，請重新嘗試。',
  ORDER_NOT_FOUND: '找不到此訂單。',
  PAYMENT_REQUEST_NOT_ALLOWED: '此訂單無法進行付款。',
  RESOURCE_NOT_FOUND: '找不到付款記錄。'
};

onMounted(async () => {
  orderId.value = String(route.query.orderId ?? '');
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

  if (!orderId.value || !transactionId) {
    isError.value = true;
    message.value = '缺少付款確認參數，請回到商品頁重新下單。';
    return;
  }

  try {
    await paymentStore.confirmLinePay(
      orderId.value,
      transactionId,
      guestToken.value || undefined
    );
    message.value = '付款成功，感謝您的消費！';
    void authStore.refreshUser();
  } catch (err) {
    isError.value = true;
    if (axios.isAxiosError(err)) {
      const code = err.response?.data?.code as string | undefined;
      if (code) {
        errorCode.value = code;
        message.value = ERROR_MESSAGES[code] ?? err.response?.data?.message ?? '付款確認失敗，請稍後再試。';
      } else {
        message.value = err.response?.data?.message ?? '付款確認失敗，請稍後再試。';
      }
    } else {
      message.value = '付款確認失敗，請稍後再試。';
    }
  }
});
</script>
