<template>
  <section
    class="grid min-h-[calc(100vh-64px)] gap-5 bg-amber-50 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]"
  >
    <form
      class="order-2 grid gap-4 rounded-lg border border-stone-300 bg-white p-6 lg:order-1"
      @submit.prevent="submit"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">
          結帳
        </h1>
        <p class="m-0 text-stone-600">
          建立訂單後將前往 Line Pay 付款。
        </p>
      </div>

      <fieldset class="grid gap-3 border-0 p-0">
        <legend class="font-bold">
          訂單類型
        </legend>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="mode"
            type="radio"
            value="member"
            @click.prevent="handleMemberClick"
          >
          會員點餐
          <span
            v-if="!authStore.isAuthenticated"
            class="text-xs text-stone-500"
          >（需登入）</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            v-model="mode"
            type="radio"
            value="guest"
          >
          訪客點餐
        </label>
      </fieldset>

      <div
        v-if="mode === 'guest'"
        class="grid gap-3"
      >
        <label class="grid gap-1.5 font-semibold">
          姓名
          <input
            v-model="guestName"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            required
          >
        </label>
        <label class="grid gap-1.5 font-semibold">
          手機
          <input
            v-model="guestPhone"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            pattern="09[0-9]{8}"
            required
          >
        </label>
        <label class="grid gap-1.5 font-semibold">
          電子郵件
          <input
            v-model="guestEmail"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            type="email"
          >
        </label>
      </div>

      <div
        v-else
        class="grid gap-3"
      >
        <label class="grid gap-1.5 font-semibold">
          取餐手機
          <input
            v-model="memberPhone"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            pattern="09[0-9]{8}"
            placeholder="例如 0912345678"
            required
          >
        </label>
        <p class="m-0 text-xs text-stone-500">
          此手機會顯示在訂單追蹤與點餐紀錄，用於核對取餐訂單。
        </p>
      </div>

      <p
        v-if="errorMessage"
        class="m-0 font-semibold text-red-700"
      >
        {{ errorMessage }}
      </p>

      <button
        class="h-11 w-full cursor-pointer rounded-md bg-amber-900 px-4 font-bold text-white disabled:opacity-60 sm:w-36"
        type="submit"
        :disabled="
          cartStore.items.length === 0 ||
            orderStore.isLoading ||
            paymentStore.isLoading
        "
      >
        前往付款
      </button>
    </form>

    <aside
      class="order-1 grid content-start gap-3 rounded-lg border border-stone-300 bg-white p-6 lg:order-2"
    >
      <h2 class="m-0 text-xl font-bold">
        訂單明細
      </h2>
      <p
        v-if="cartStore.items.length === 0"
        class="m-0 text-stone-600"
      >
        購物車沒有商品。
      </p>
      <RouterLink
        v-if="cartStore.items.length === 0"
        class="grid h-11 w-full place-items-center rounded-md border border-amber-900 px-4 font-bold text-amber-950 no-underline"
        to="/products"
      >
        回商品列表
      </RouterLink>
      <ul class="grid list-none gap-3 p-0">
        <li
          v-for="item in cartStore.items"
          :key="item.productId"
          class="flex justify-between gap-3 border-b border-stone-200 pb-2"
        >
          <span>{{ item.name }} x {{ item.quantity }}</span>
          <strong>NT$ {{ item.price * item.quantity }}</strong>
        </li>
      </ul>
      <footer class="flex justify-between border-t border-stone-300 pt-3">
        <span>總計</span>
        <strong>NT$ {{ cartStore.totalAmount }}</strong>
      </footer>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useCartStore } from '../../stores/cart.store';
import { useOrderStore } from '../../stores/order.store';
import { usePaymentStore } from '../../stores/payment.store';

const router = useRouter();
const authStore = useAuthStore();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const paymentStore = usePaymentStore();
const mode = ref(authStore.isAuthenticated ? 'member' : 'guest');

function handleMemberClick() {
  if (!authStore.isAuthenticated) {
    void router.push({ path: '/login', query: { redirect: '/checkout' } });
  } else {
    mode.value = 'member';
  }
}
const guestName = ref('');
const guestPhone = ref('');
const guestEmail = ref('');
const memberPhone = ref('');
const errorMessage = ref('');

async function submit() {
  errorMessage.value = '';
  try {
    const order =
      mode.value === 'member'
        ? await orderStore.createMemberOrder(cartStore.items, {
            phone: memberPhone.value
          })
        : await orderStore.createGuestOrder(cartStore.items, {
            name: guestName.value,
            phone: guestPhone.value,
            email: guestEmail.value || undefined
          });
    const payment = await paymentStore.requestLinePay(
      order.id,
      mode.value === 'guest' ? orderStore.guestToken || undefined : undefined
    );
    cartStore.clearCart();
    window.location.assign(payment.paymentUrl);
  } catch {
    errorMessage.value = '無法建立付款請求。';
  }
}
</script>
