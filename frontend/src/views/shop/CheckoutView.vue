<template>
  <section
    class="grid min-h-[calc(100vh-64px)] gap-5 bg-stone-100 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]"
  >
    <form
      class="grid gap-4 rounded-lg border border-stone-300 bg-white p-6"
      @submit.prevent="submit"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-slate-800">結帳</h1>
        <p class="m-0 text-slate-600">
          建立訂單後將前往 Line Pay 付款。
        </p>
      </div>

      <fieldset class="grid gap-3 border-0 p-0">
        <legend class="font-bold">訂單類型</legend>
        <label class="flex items-center gap-2">
          <input
            v-model="mode"
            type="radio"
            value="member"
            :disabled="!authStore.isAuthenticated"
          />
          會員點餐
        </label>
        <label class="flex items-center gap-2">
          <input v-model="mode" type="radio" value="guest" />
          訪客點餐
        </label>
      </fieldset>

      <div v-if="mode === 'guest'" class="grid gap-3">
        <label class="grid gap-1.5 font-semibold">
          姓名
          <input
            v-model="guestName"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            required
          />
        </label>
        <label class="grid gap-1.5 font-semibold">
          手機
          <input
            v-model="guestPhone"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            pattern="09[0-9]{8}"
            required
          />
        </label>
        <label class="grid gap-1.5 font-semibold">
          電子郵件
          <input
            v-model="guestEmail"
            class="min-h-10 rounded-md border border-stone-400 px-2.5"
            type="email"
          />
        </label>
      </div>

      <p v-if="errorMessage" class="m-0 font-semibold text-red-700">
        {{ errorMessage }}
      </p>

      <button
        class="min-h-10 rounded-md bg-slate-800 px-4 font-bold text-white disabled:opacity-60"
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
      class="grid content-start gap-3 rounded-lg border border-stone-300 bg-white p-6"
    >
      <h2 class="m-0 text-xl font-bold">訂單明細</h2>
      <p v-if="cartStore.items.length === 0" class="m-0 text-slate-600">
        購物車沒有商品。
      </p>
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
import { useAuthStore } from '../../stores/auth.store';
import { useCartStore } from '../../stores/cart.store';
import { useOrderStore } from '../../stores/order.store';
import { usePaymentStore } from '../../stores/payment.store';

const authStore = useAuthStore();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const paymentStore = usePaymentStore();
const mode = ref(authStore.isAuthenticated ? 'member' : 'guest');
const guestName = ref('');
const guestPhone = ref('');
const guestEmail = ref('');
const errorMessage = ref('');

async function submit() {
  errorMessage.value = '';
  try {
    const order =
      mode.value === 'member'
        ? await orderStore.createMemberOrder(cartStore.items)
        : await orderStore.createGuestOrder(cartStore.items, {
            name: guestName.value,
            phone: guestPhone.value,
            email: guestEmail.value || undefined
          });
    const payment = await paymentStore.requestLinePay(
      order.id,
      orderStore.guestToken || undefined
    );
    cartStore.clearCart();
    window.location.assign(payment.paymentUrl);
  } catch {
    errorMessage.value = '無法建立付款請求。';
  }
}
</script>
