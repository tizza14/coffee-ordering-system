<template>
  <section
    class="grid min-h-[calc(100vh-64px)] place-items-center bg-amber-50 p-4 sm:p-6"
  >
    <article
      class="grid w-full max-w-lg gap-3 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
    >
      <h1 class="m-0 text-2xl font-bold text-amber-950">
        {{ isError ? '付款失敗' : '付款確認' }}
      </h1>
      <p class="m-0 text-stone-700">
        {{ message }}
      </p>
      <p
        v-if="errorCode"
        class="m-0 text-sm text-red-600"
      >
        錯誤代碼：{{ errorCode }}
      </p>
      <p
        v-if="lookupCode"
        class="m-0 flex flex-wrap items-center gap-2 text-sm text-stone-600"
      >
        訂單查詢碼：<strong class="text-amber-950">{{ lookupCode }}</strong>
        <button
          type="button"
          class="cursor-pointer rounded px-1.5 py-0.5 text-xs font-bold transition"
          :class="codeCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500 hover:bg-amber-100 hover:text-amber-900'"
          @click="copyCode"
        >
          {{ codeCopied ? '已複製 ✓' : '複製' }}
        </button>
      </p>
      <div class="flex flex-wrap gap-3 pt-2">
        <button
          v-if="isError && orderId"
          class="min-h-10 cursor-pointer rounded-md bg-amber-900 px-4 py-2 font-bold text-white disabled:opacity-60"
          type="button"
          :disabled="paymentStore.isLoading"
          @click="retryPayment"
        >
          {{ paymentStore.isLoading ? '建立付款中...' : '重新付款' }}
        </button>
        <RouterLink
          v-if="trackingQuery.lookupCode"
          class="rounded-md border border-amber-900 px-4 py-2 font-bold text-amber-950 no-underline"
          :to="{ path: '/orders/guest', query: trackingQuery }"
        >
          查看訂單追蹤
        </RouterLink>
        <RouterLink
          class="rounded-md border border-stone-400 px-4 py-2 font-bold text-stone-700 no-underline"
          to="/products"
        >
          回商品列表
        </RouterLink>
      </div>
      <RouterLink
        v-if="isError && authStore.isAuthenticated"
        class="text-sm text-stone-500 underline-offset-2 hover:text-amber-900 hover:underline no-underline"
        to="/orders/my"
      >
        查看點餐紀錄
      </RouterLink>
      <p
        v-if="isError"
        class="m-0 text-xs text-stone-500"
      >
        訂單仍會保留。若付款已扣款但畫面顯示失敗，請保留訂單查詢碼並聯絡店員確認。
      </p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../../stores/auth.store';
import { useOrderStore } from '../../stores/order.store';
import { usePaymentStore } from '../../stores/payment.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const orderStore = useOrderStore();
const paymentStore = usePaymentStore();

const message = ref('正在確認付款...');
const errorCode = ref('');
const isError = ref(false);
const lookupCode = ref('');
const guestToken = ref('');
const orderId = ref('');
const codeCopied = ref(false);

async function copyCode() {
  await navigator.clipboard.writeText(lookupCode.value);
  codeCopied.value = true;
  setTimeout(() => { codeCopied.value = false; }, 2000);
}

const trackingQuery = computed(() => ({
  lookupCode: lookupCode.value,
  phone: orderStore.guestPhone || undefined,
  guestToken: guestToken.value || undefined
}));

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_AMOUNT_MISMATCH: '付款金額不一致，請聯絡店員確認。',
  ORDER_ACCESS_DENIED: '無法確認這筆訂單，請重新查詢訂單。',
  ORDER_NOT_FOUND: '找不到訂單。',
  PAYMENT_REQUEST_NOT_ALLOWED: '此訂單目前不能付款，請查看訂單狀態。',
  RESOURCE_NOT_FOUND: '找不到付款紀錄。'
};

async function retryPayment() {
  if (!orderId.value) return;

  errorCode.value = '';
  try {
    const payment = await paymentStore.requestLinePay(
      orderId.value,
      guestToken.value || undefined
    );
    window.location.assign(payment.paymentUrl);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const code = err.response?.data?.code as string | undefined;
      if (code) errorCode.value = code;
      message.value =
        (code ? ERROR_MESSAGES[code] : undefined) ??
        err.response?.data?.message ??
        '無法重新建立付款，請稍後再試或查看訂單追蹤。';
      return;
    }
    message.value = '無法重新建立付款，請稍後再試或查看訂單追蹤。';
  }
}

onMounted(async () => {
  orderId.value = String(route.query.orderId ?? '');
  const transactionId = String(route.query.transactionId ?? '');
  guestToken.value = String(route.query.guestToken ?? orderStore.guestToken ?? '');
  lookupCode.value = String(
    route.query.lookupCode ?? orderStore.guestLookupCode ?? ''
  );

  if (lookupCode.value && (guestToken.value || orderStore.guestPhone)) {
    orderStore.setGuestTrackingSession({
      lookupCode: lookupCode.value,
      guestToken: guestToken.value || undefined,
      phone: orderStore.guestPhone || undefined
    });
  }

  if (!orderId.value || !transactionId) {
    isError.value = true;
    message.value = '缺少付款確認資訊，請回商品列表重新操作。';
    return;
  }

  try {
    await paymentStore.confirmLinePay(
      orderId.value,
      transactionId,
      guestToken.value || undefined
    );
    message.value = '付款成功，正在前往訂單追蹤。';
    void authStore.refreshUser();

    if (trackingQuery.value.lookupCode) {
      await router.replace({
        path: '/orders/guest',
        query: trackingQuery.value
      });
    }
  } catch (err) {
    isError.value = true;
    if (axios.isAxiosError(err)) {
      const code = err.response?.data?.code as string | undefined;
      if (code) {
        errorCode.value = code;
        message.value =
          ERROR_MESSAGES[code] ??
          err.response?.data?.message ??
          '付款確認失敗，請重新付款或查看訂單追蹤。';
      } else {
        message.value =
          err.response?.data?.message ?? '付款確認失敗，請重新付款或查看訂單追蹤。';
      }
    } else {
      message.value = '付款確認失敗，請重新付款或查看訂單追蹤。';
    }
  }
});
</script>
