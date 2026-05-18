<template>
  <section
    class="grid min-h-[calc(100vh-64px)] gap-5 bg-amber-50 p-4 sm:p-6 lg:grid-cols-[360px_minmax(0,1fr)]"
  >
    <form
      class="grid content-start gap-3 rounded-lg border border-stone-300 bg-white p-5"
      @submit.prevent="saveProduct"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">商品管理</h1>
        <p class="m-0 text-stone-600">
          管理店內商品與可兌換品項。
        </p>
      </div>

      <label class="grid gap-1.5 font-semibold">
        商品名稱
        <input
          v-model="form.name"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          required
        />
      </label>
      <label class="grid gap-1.5 font-semibold">
        價格
        <input
          v-model.number="form.price"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          min="0"
          required
          type="number"
        />
      </label>
      <label class="grid gap-1.5 font-semibold">
        分類
        <select
          v-model="form.category"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
        >
          <option value="coffee">咖啡</option>
          <option value="dessert">甜點</option>
        </select>
      </label>
      <label class="grid gap-1.5 font-semibold">
        說明
        <textarea
          v-model="form.description"
          class="min-h-24 rounded-md border border-stone-400 px-2.5 py-2"
        />
      </label>
      <label class="grid gap-1.5 font-semibold">
        圖片網址
        <input
          v-model="form.imageUrl"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          placeholder="https://..."
          type="url"
        />
        <img
          v-if="form.imageUrl"
          :src="form.imageUrl"
          alt="預覽"
          class="h-32 w-32 rounded-lg object-cover"
        />
      </label>

      <label class="flex items-center gap-2 font-semibold">
        <input v-model="form.isAvailable" type="checkbox" />
        上架中
      </label>
      <label class="flex items-center gap-2 font-semibold">
        <input v-model="form.isRedeemable" type="checkbox" />
        可用 3 點兌換
      </label>

      <p v-if="loadError" class="m-0 font-bold text-red-700">
        {{ loadError }}
      </p>

      <div class="flex flex-wrap gap-2">
        <button
          class="min-h-10 cursor-pointer rounded-md bg-amber-900 px-4 font-bold text-white"
          type="submit"
        >
          {{ editingId ? '更新' : '新增' }}
        </button>
        <button
          v-if="editingId"
          class="min-h-10 cursor-pointer rounded-md border border-stone-500 bg-white px-4 font-bold text-amber-950"
          type="button"
          @click="resetForm"
        >
          取消
        </button>
      </div>
    </form>

    <div class="grid content-start gap-3">
      <header
        class="flex items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch"
      >
        <h2 class="m-0 text-xl font-bold text-amber-950">商品列表</h2>
        <button
          class="min-h-10 cursor-pointer rounded-md border border-stone-500 bg-white px-4 font-bold text-amber-950"
          type="button"
          @click="loadProducts"
        >
          重新整理
        </button>
      </header>

      <p
        v-if="productStore.isLoading"
        class="m-0 rounded-lg border border-stone-300 bg-white p-4"
      >
        載入商品中...
      </p>
      <ul v-else class="grid list-none gap-3 p-0">
        <li
          v-for="product in productStore.products"
          :key="product.id"
          class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
        >
          <div
            class="flex items-start justify-between gap-4 max-[760px]:flex-col"
          >
            <div>
              <h3 class="m-0 text-lg font-bold text-amber-950">
                {{ product.name }}
              </h3>
              <p class="m-0 text-stone-600">
                {{ product.description || '尚無說明' }}
              </p>
            </div>
            <strong>NT$ {{ product.price }}</strong>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full bg-stone-200 px-2 py-1 text-xs font-extrabold uppercase text-amber-900"
            >
              {{ categoryLabel(product.category) }}
            </span>
            <span
              class="rounded-full px-2 py-1 text-xs font-extrabold uppercase"
              :class="
                product.isAvailable
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-200 text-stone-600'
              "
            >
              {{ product.isAvailable ? '上架' : '下架' }}
            </span>
            <span
              v-if="product.isRedeemable"
              class="rounded-full bg-amber-100 px-2 py-1 text-xs font-extrabold uppercase text-amber-800"
            >
              {{ product.redeemPoints }} 點
            </span>
          </div>
          <footer class="flex flex-wrap gap-2">
            <button
              class="min-h-9 cursor-pointer rounded-md border border-stone-500 bg-white px-3 font-bold text-amber-950"
              type="button"
              @click="editProduct(product)"
            >
              編輯
            </button>
            <button
              class="min-h-9 cursor-pointer rounded-md border border-red-700 bg-white px-3 font-bold text-red-700"
              type="button"
              @click="handleDelete(product.id)"
            >
              刪除
            </button>
          </footer>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { Product } from '../../api/product.api';
import { useProductAdminStore } from '../../stores/product-admin.store';
import { useToastStore } from '../../stores/toast.store';
import { extractApiError } from '../../api/http';

const productStore = useProductAdminStore();
const toastStore = useToastStore();
const editingId = ref('');
const loadError = ref('');
const form = reactive({
  name: '',
  price: 0,
  category: 'coffee' as Product['category'],
  description: '',
  imageUrl: '',
  isAvailable: true,
  isRedeemable: false
});

function categoryLabel(value: Product['category']) {
  return value === 'coffee' ? '咖啡' : '甜點';
}

function resetForm() {
  editingId.value = '';
  form.name = '';
  form.price = 0;
  form.category = 'coffee';
  form.description = '';
  form.imageUrl = '';
  form.isAvailable = true;
  form.isRedeemable = false;
}

function editProduct(product: Product) {
  editingId.value = product.id;
  form.name = product.name;
  form.price = product.price;
  form.category = product.category;
  form.description = product.description;
  form.imageUrl = product.imageUrl ?? '';
  form.isAvailable = product.isAvailable;
  form.isRedeemable = product.isRedeemable;
}

async function saveProduct() {
  const payload = { ...form, redeemPoints: 3 as const };
  try {
    if (editingId.value) {
      await productStore.updateProduct(editingId.value, payload);
      toastStore.success('商品已更新');
    } else {
      await productStore.createProduct(payload);
      toastStore.success('商品已新增');
    }
    resetForm();
  } catch (err) {
    toastStore.error(extractApiError(err) || '無法儲存商品。');
  }
}

async function handleDelete(id: string) {
  try {
    await productStore.deleteProduct(id);
    toastStore.success('商品已刪除');
  } catch (err) {
    toastStore.error(extractApiError(err) || '無法刪除商品。');
  }
}

async function loadProducts() {
  loadError.value = '';
  try {
    await productStore.loadProducts();
  } catch {
    loadError.value = '無法載入商品。';
  }
}

onMounted(loadProducts);
</script>
