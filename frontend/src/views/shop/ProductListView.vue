<template>
  <section class="grid min-h-[calc(100vh-64px)] grid-cols-[minmax(0,1fr)_340px] gap-6 bg-stone-100 p-6 max-[820px]:grid-cols-1">
    <div class="min-w-0">
      <header class="flex items-center justify-between gap-4 max-[820px]:flex-col max-[820px]:items-stretch">
        <div>
          <h1 class="m-0 text-2xl font-bold text-slate-800">
            Products
          </h1>
          <p class="m-0 text-slate-600">
            Available coffee and desserts
          </p>
        </div>
        <div class="flex gap-2">
          <button
            v-for="option in categoryOptions"
            :key="option.value"
            type="button"
            class="min-h-9 rounded-md border border-stone-500 px-3 font-bold text-slate-800"
            :class="selectedCategory === option.value ? 'border-slate-800 bg-slate-800 text-white' : 'bg-white'"
            @click="selectedCategory = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </header>

      <p
        v-if="isLoading"
        class="py-4"
      >
        Loading products...
      </p>
      <p
        v-else-if="errorMessage"
        class="py-4 font-bold text-red-700"
      >
        {{ errorMessage }}
      </p>
      <ul
        v-else
        class="grid list-none gap-3 p-0"
      >
        <li
          v-for="product in filteredProducts"
          :key="product.id"
          class="flex items-center justify-between gap-4 rounded-lg border border-stone-300 bg-white p-4 max-[820px]:flex-col max-[820px]:items-stretch"
        >
          <div class="grid gap-1.5">
            <span class="w-fit rounded-full bg-stone-200 px-2 py-0.5 text-xs font-extrabold uppercase text-slate-600">{{ product.category }}</span>
            <h2 class="m-0 text-xl font-bold text-slate-800">
              {{ product.name }}
            </h2>
            <p class="m-0 text-slate-600">
              {{ product.description || 'No description' }}
            </p>
            <strong>NT$ {{ product.price }}</strong>
          </div>
          <div class="grid justify-items-end gap-2.5 max-[820px]:justify-items-stretch">
            <span
              v-if="product.isRedeemable"
              class="w-fit rounded-full bg-stone-200 px-2 py-0.5 text-xs font-extrabold uppercase text-slate-600"
            >
              {{ product.redeemPoints }} pts
            </span>
            <button
              class="min-h-9 rounded-md border border-slate-800 bg-slate-800 px-3 font-bold text-white"
              type="button"
              @click="cartStore.addProduct(product)"
            >
              Add
            </button>
          </div>
        </li>
      </ul>
    </div>

    <aside class="grid min-w-0 gap-4 self-start rounded-lg border border-stone-300 bg-white p-4">
      <div class="flex items-center justify-between gap-4">
        <h2 class="m-0 text-xl font-bold text-slate-800">
          Cart
        </h2>
        <button
          class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800 disabled:opacity-55"
          type="button"
          :disabled="cartStore.items.length === 0"
          @click="cartStore.clearCart()"
        >
          Clear
        </button>
      </div>

      <p
        v-if="cartStore.items.length === 0"
        class="py-4 text-slate-600"
      >
        No items selected.
      </p>
      <ul
        v-else
        class="grid list-none gap-3 p-0"
      >
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
              class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800"
              type="button"
              @click="cartStore.decrement(item.productId)"
            >
              -
            </button>
            <span>{{ item.quantity }}</span>
            <button
              class="min-h-9 rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800"
              type="button"
              @click="cartStore.increment(item.productId)"
            >
              +
            </button>
          </div>
          <button
            type="button"
            class="col-span-full min-h-8 w-fit rounded-md border border-stone-500 bg-white px-3 font-bold text-slate-800"
            @click="cartStore.removeProduct(item.productId)"
          >
            Remove
          </button>
        </li>
      </ul>

      <footer class="flex items-center justify-between gap-4 border-t border-stone-300 pt-3.5">
        <span>Total</span>
        <strong>NT$ {{ cartStore.totalAmount }}</strong>
      </footer>
      <RouterLink
        class="grid min-h-10 place-items-center rounded-md bg-slate-800 px-4 font-bold text-white no-underline"
        to="/checkout"
      >
        Checkout
      </RouterLink>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getProducts, type Product } from '../../api/product.api';
import { useCartStore } from '../../stores/cart.store';

type CategoryFilter = 'all' | 'coffee' | 'dessert';

const categoryOptions: Array<{ label: string; value: CategoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Coffee', value: 'coffee' },
  { label: 'Dessert', value: 'dessert' }
];

const cartStore = useCartStore();
const products = ref<Product[]>([]);
const selectedCategory = ref<CategoryFilter>('all');
const isLoading = ref(false);
const errorMessage = ref('');

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'all') return products.value;
  return products.value.filter((product) => product.category === selectedCategory.value);
});

onMounted(async () => {
  isLoading.value = true;
  try {
    const result = await getProducts();
    products.value = result.data;
  } catch {
    errorMessage.value = 'Unable to load products.';
  } finally {
    isLoading.value = false;
  }
});
</script>
