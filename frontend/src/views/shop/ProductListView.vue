<template>
  <section
    class="grid min-h-[calc(100vh-64px)] grid-cols-[minmax(0,1fr)_340px] gap-5 bg-amber-50 p-4 pb-24 sm:gap-6 sm:p-6 sm:pb-24 max-[820px]:grid-cols-1 min-[821px]:pb-6"
  >
    <div class="min-w-0">
      <header
        class="flex items-center justify-between gap-4 max-[820px]:flex-col max-[820px]:items-stretch"
      >
        <div>
          <h1 class="m-0 text-2xl font-bold text-amber-950">商品</h1>
          <p class="m-0 text-stone-600">可點選咖啡與甜點</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in categoryOptions"
            :key="option.value"
            type="button"
            class="min-h-9 cursor-pointer rounded-md border border-stone-500 px-3 font-bold text-amber-950"
            :class="
              selectedCategory === option.value
                ? 'border-amber-900 bg-amber-900 text-white'
                : 'bg-white'
            "
            @click="selectedCategory = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </header>

      <ul v-if="isLoading" class="grid list-none gap-3 p-0">
        <li
          v-for="i in 4"
          :key="i"
          class="flex animate-pulse items-center gap-4 rounded-lg border border-stone-200 bg-white p-4"
        >
          <div class="h-24 w-24 shrink-0 rounded-lg bg-stone-200"></div>
          <div class="flex-1 space-y-2.5">
            <div class="h-3 w-12 rounded-full bg-stone-200"></div>
            <div class="h-5 w-36 rounded bg-stone-200"></div>
            <div class="h-3 w-52 rounded bg-stone-200"></div>
            <div class="h-4 w-20 rounded bg-stone-200"></div>
          </div>
        </li>
      </ul>
      <p v-else-if="errorMessage" class="py-4 font-bold text-red-700">
        {{ errorMessage }}
      </p>
      <ul v-else class="grid list-none gap-3 p-0">
        <li
          v-for="product in filteredProducts"
          :key="product.id"
          class="flex items-center justify-between gap-4 rounded-lg border border-stone-300 bg-white p-4 max-[820px]:flex-col max-[820px]:items-stretch"
        >
          <div class="flex min-w-0 gap-4">
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="h-24 w-24 shrink-0 rounded-lg object-cover"
            />
            <div
              v-else
              class="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 8h6M9 12h4m-7 8h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 8c1.657 0 3 .895 3 2s-1.343 2-3 2" />
              </svg>
            </div>
            <div class="grid gap-1.5">
              <span
                class="w-fit rounded-full bg-stone-200 px-2 py-0.5 text-xs font-extrabold uppercase text-stone-600"
              >
                {{ categoryLabel(product.category) }}
              </span>
              <h2 class="m-0 text-xl font-bold text-amber-950">
                {{ product.name }}
              </h2>
              <p class="m-0 text-stone-600">
                {{ product.description || '尚無說明' }}
              </p>
              <strong>NT$ {{ product.price }}</strong>
            </div>
          </div>
          <div
            class="grid justify-items-end gap-2.5 max-[820px]:justify-items-stretch"
          >
            <span
              v-if="product.isRedeemable"
              class="w-fit rounded-full bg-stone-200 px-2 py-0.5 text-xs font-extrabold uppercase text-stone-600"
            >
              可兌換 {{ product.redeemPoints }} 點
            </span>
            <button
              class="min-h-9 cursor-pointer rounded-md border border-amber-900 bg-amber-900 px-3 font-bold text-white"
              type="button"
              @click="cartStore.addProduct(product)"
            >
              加入
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Desktop sidebar cart (sticky, hidden on mobile) -->
    <aside
      data-testid="cart-panel"
      class="sticky top-[72px] hidden max-h-[calc(100vh-88px)] min-w-0 gap-4 self-start overflow-y-auto rounded-lg border border-stone-300 bg-white p-4 min-[821px]:grid"
    >
      <div class="flex items-center justify-between gap-4">
        <h2 class="m-0 text-xl font-bold text-amber-950">購物車</h2>
        <button
          class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950 disabled:opacity-55"
          type="button"
          :disabled="cartStore.items.length === 0"
          @click="cartStore.clearCart()"
        >
          清空
        </button>
      </div>

      <p v-if="cartStore.items.length === 0" class="py-4 text-stone-600">
        目前尚未選擇商品。
      </p>
      <ul v-else class="grid list-none gap-3 p-0">
        <li
          v-for="item in cartStore.items"
          :key="item.productId"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-b border-stone-200 pb-3"
        >
          <div class="grid gap-1">
            <strong>{{ item.name }}</strong>
            <span>NT$ {{ item.price }}</span>
          </div>
          <div class="grid grid-cols-[34px_32px_34px] items-center text-center">
            <button
              class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
              type="button"
              @click="cartStore.decrement(item.productId)"
            >
              -
            </button>
            <span>{{ item.quantity }}</span>
            <button
              class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
              type="button"
              @click="cartStore.increment(item.productId)"
            >
              +
            </button>
          </div>
          <button
            type="button"
            class="col-span-full min-h-8 w-fit cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
            @click="cartStore.removeProduct(item.productId)"
          >
            移除
          </button>
        </li>
      </ul>

      <footer
        data-testid="cart-footer"
        class="flex items-center justify-between gap-4 border-t border-stone-300 pt-3.5"
      >
        <span>總計</span>
        <strong>NT$ {{ cartStore.totalAmount }}</strong>
      </footer>
      <RouterLink
        class="grid h-11 w-36 shrink-0 place-items-center justify-self-end rounded-md bg-amber-900 px-4 font-bold text-white no-underline"
        to="/checkout"
      >
        前往結帳
      </RouterLink>
    </aside>
  </section>

  <!-- Mobile fixed bottom cart (hidden on desktop) -->
  <div class="fixed bottom-0 left-0 right-0 z-40 min-[821px]:hidden">
    <!-- Expandable cart panel -->
    <Transition name="slide-up">
      <div
        v-show="mobileCartOpen"
        data-testid="cart-panel"
        class="max-h-[60vh] overflow-y-auto border-t border-stone-300 bg-white px-4 pb-4 pt-3 shadow-lg"
      >
        <div class="flex items-center justify-between gap-4 pb-3">
          <h2 class="m-0 text-lg font-bold text-amber-950">購物車明細</h2>
          <button
            class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950 disabled:opacity-55"
            type="button"
            :disabled="cartStore.items.length === 0"
            @click="cartStore.clearCart()"
          >
            清空
          </button>
        </div>
        <p v-if="cartStore.items.length === 0" class="py-3 text-stone-600">
          目前尚未選擇商品。
        </p>
        <ul v-else class="grid list-none gap-3 p-0">
          <li
            v-for="item in cartStore.items"
            :key="item.productId"
            class="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-b border-stone-200 pb-3"
          >
            <div class="grid gap-1">
              <strong>{{ item.name }}</strong>
              <span>NT$ {{ item.price }}</span>
            </div>
            <div class="grid grid-cols-[34px_32px_34px] items-center text-center">
              <button
                class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
                type="button"
                @click="cartStore.decrement(item.productId)"
              >
                -
              </button>
              <span>{{ item.quantity }}</span>
              <button
                class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
                type="button"
                @click="cartStore.increment(item.productId)"
              >
                +
              </button>
            </div>
            <button
              type="button"
              class="col-span-full min-h-8 w-fit cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
              @click="cartStore.removeProduct(item.productId)"
            >
              移除
            </button>
          </li>
        </ul>
        <footer
          data-testid="cart-footer"
          class="flex items-center justify-between gap-4 border-t border-stone-300 pt-3.5"
        >
          <span>總計</span>
          <strong>NT$ {{ cartStore.totalAmount }}</strong>
        </footer>
        <RouterLink
          class="mt-3 grid h-11 w-full place-items-center rounded-md bg-amber-900 px-4 font-bold text-white no-underline"
          to="/checkout"
          @click="mobileCartOpen = false"
        >
          前往結帳
        </RouterLink>
      </div>
    </Transition>

    <!-- Toggle bar -->
    <button
      type="button"
      class="flex w-full items-center justify-between bg-amber-900 px-4 py-3 font-bold text-white shadow-md"
      @click="mobileCartOpen = !mobileCartOpen"
    >
      <span class="flex items-center gap-2">
        <span>購物車</span>
        <span
          v-if="totalQuantity > 0"
          class="rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-amber-900"
        >
          {{ totalQuantity }}
        </span>
      </span>
      <span class="flex items-center gap-2">
        <span>NT$ {{ cartStore.totalAmount }}</span>
        <span class="text-sm">{{ mobileCartOpen ? '▾' : '▴' }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getProducts, type Product } from '../../api/product.api';
import { useCartStore } from '../../stores/cart.store';

type CategoryFilter = 'all' | 'coffee' | 'dessert';

const categoryOptions: Array<{ label: string; value: CategoryFilter }> = [
  { label: '全部', value: 'all' },
  { label: '咖啡', value: 'coffee' },
  { label: '甜點', value: 'dessert' }
];

const cartStore = useCartStore();
const products = ref<Product[]>([]);
const selectedCategory = ref<CategoryFilter>('all');
const isLoading = ref(false);
const errorMessage = ref('');
const mobileCartOpen = ref(false);

const totalQuantity = computed(() =>
  cartStore.items.reduce((sum, item) => sum + item.quantity, 0)
);

function categoryLabel(value: Product['category']) {
  return value === 'coffee' ? '咖啡' : '甜點';
}

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'all') return products.value;
  return products.value.filter(
    (product) => product.category === selectedCategory.value
  );
});

onMounted(async () => {
  isLoading.value = true;
  try {
    const result = await getProducts({ available: true });
    products.value = result.data;
  } catch {
    errorMessage.value = '無法載入商品。';
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
