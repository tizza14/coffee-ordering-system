<template>
  <section
    class="grid min-h-[calc(100vh-64px)] gap-5 bg-amber-50 p-4 sm:p-6 lg:grid-cols-[360px_minmax(0,1fr)]"
  >
    <form
      class="grid content-start gap-3 rounded-lg border border-stone-300 bg-white p-5"
      @submit.prevent="saveProduct"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">
          商品管理
        </h1>
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
        >
      </label>
      <label class="grid gap-1.5 font-semibold">
        價格
        <input
          v-model.number="form.price"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          min="0"
          required
          type="number"
        >
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
      <div class="grid gap-1.5 font-semibold">
        商品圖片
        <label
          class="flex cursor-pointer items-center gap-2 rounded-md border border-stone-400 px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          <input
            ref="fileInput"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            type="file"
            @change="onFileChange"
          >
          {{ pendingFile ? pendingFile.name : '選擇圖片（JPEG / PNG / WebP，最大 5 MB）' }}
        </label>
        <img
          v-if="previewUrl || form.imageUrl"
          :src="previewUrl || form.imageUrl"
          alt="預覽"
          class="h-32 w-32 rounded-lg object-cover"
        >
        <button
          v-if="previewUrl || form.imageUrl"
          class="min-h-9 w-fit cursor-pointer rounded-md border border-red-700 bg-white px-3 text-sm font-bold text-red-700"
          type="button"
          @click="removeImage"
        >
          移除圖片
        </button>
      </div>

      <label class="flex items-center gap-2 font-semibold">
        <input
          v-model="form.isAvailable"
          type="checkbox"
        >
        上架中
      </label>
      <label class="flex items-center gap-2 font-semibold">
        <input
          v-model="form.isRedeemable"
          type="checkbox"
        >
        可用 3 點兌換
      </label>

      <p
        v-if="loadError"
        class="m-0 font-bold text-red-700"
      >
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
        <h2 class="m-0 text-xl font-bold text-amber-950">
          商品列表
        </h2>
        <button
          class="min-h-10 cursor-pointer rounded-md border border-stone-500 bg-white px-4 font-bold text-amber-950"
          type="button"
          @click="loadProducts"
        >
          重新整理
        </button>
      </header>

      <ul
        v-if="productStore.isLoading"
        class="grid list-none gap-3 p-0"
      >
        <li
          v-for="i in 4"
          :key="i"
          class="animate-pulse grid gap-3 rounded-lg border border-stone-200 bg-white p-4"
        >
          <div class="flex items-start gap-4">
            <div class="h-20 w-20 shrink-0 rounded-lg bg-stone-200" />
            <div class="flex flex-1 items-start justify-between gap-4">
              <div class="flex-1 space-y-2">
                <div class="h-5 w-40 rounded bg-stone-200" />
                <div class="h-3 w-56 rounded bg-stone-200" />
              </div>
              <div class="h-5 w-16 rounded bg-stone-200" />
            </div>
          </div>
          <div class="flex gap-2">
            <div class="h-5 w-12 rounded-full bg-stone-200" />
            <div class="h-5 w-10 rounded-full bg-stone-200" />
          </div>
          <div class="flex gap-2">
            <div class="h-8 w-14 rounded bg-stone-200" />
            <div class="h-8 w-14 rounded bg-stone-200" />
          </div>
        </li>
      </ul>
      <ul
        v-else
        class="grid list-none gap-3 p-0"
      >
        <li
          v-for="product in productStore.products"
          :key="product.id"
          class="grid gap-3 rounded-lg border border-stone-300 bg-white p-4"
        >
          <div
            class="flex items-start gap-4 max-[760px]:flex-col"
          >
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="h-20 w-20 shrink-0 rounded-lg object-cover"
            >
            <div
              v-else
              class="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 8h6M9 12h4m-7 8h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 8c1.657 0 3 .895 3 2s-1.343 2-3 2"
                />
              </svg>
            </div>
            <div class="flex min-w-0 flex-1 items-start justify-between gap-4 max-[760px]:flex-col">
              <div class="min-w-0">
                <h3 class="m-0 text-lg font-bold text-amber-950">
                  {{ product.name }}
                </h3>
                <p class="m-0 text-stone-600">
                  {{ product.description || '尚無說明' }}
                </p>
              </div>
              <strong class="shrink-0">NT$ {{ product.price }}</strong>
            </div>
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
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { Product } from '../../api/product.api';
import { useProductAdminStore } from '../../stores/product-admin.store';
import { useToastStore } from '../../stores/toast.store';
import { useConfirmStore } from '../../stores/confirm.store';
import { extractApiError } from '../../api/http';

const productStore = useProductAdminStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();
const editingId = ref('');
const loadError = ref('');
const pendingFile = ref<File | null>(null);
const previewUrl = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
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

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  pendingFile.value = file;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
}

function clearSelectedImage() {
  pendingFile.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  if (fileInput.value) fileInput.value.value = '';
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
  clearSelectedImage();
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
  clearSelectedImage();
}

async function removeImage() {
  if (pendingFile.value) {
    clearSelectedImage();
    return;
  }

  if (!editingId.value || !form.imageUrl) {
    form.imageUrl = '';
    return;
  }

  const confirmed = await confirmStore.confirm({
    title: '移除圖片',
    message: '確定要移除此商品圖片嗎？',
    confirmLabel: '移除',
    danger: true
  });
  if (!confirmed) return;

  try {
    const product = await productStore.removeProductImage(editingId.value);
    form.imageUrl = product.imageUrl ?? '';
    toastStore.success('商品圖片已移除');
  } catch (err) {
    toastStore.error(extractApiError(err) || '無法移除商品圖片。');
  }
}

async function saveProduct() {
  const payload = {
    name: form.name,
    price: form.price,
    category: form.category,
    description: form.description,
    isAvailable: form.isAvailable,
    isRedeemable: form.isRedeemable,
    redeemPoints: 3 as const
  };
  try {
    let saved: Product;
    if (editingId.value) {
      saved = await productStore.updateProduct(editingId.value, payload);
    } else {
      saved = await productStore.createProduct(payload);
    }

    if (pendingFile.value) {
      await productStore.uploadProductImage(saved.id, pendingFile.value);
    }

    toastStore.success(editingId.value ? '商品已更新' : '商品已新增');
    resetForm();
  } catch (err) {
    toastStore.error(extractApiError(err) || '無法儲存商品。');
  }
}

async function handleDelete(id: string) {
  const confirmed = await confirmStore.confirm({
    title: '刪除商品',
    message: '確定要刪除此商品嗎？此操作無法還原。',
    confirmLabel: '刪除',
    danger: true
  });
  if (!confirmed) return;
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
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>
