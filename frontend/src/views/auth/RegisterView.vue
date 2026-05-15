<template>
  <section
    class="grid min-h-[calc(100vh-64px)] place-items-center bg-stone-100 p-4 sm:p-6"
  >
    <form
      class="grid w-full max-w-[420px] gap-4 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
      @submit.prevent="submit"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-slate-800">註冊</h1>
        <p class="m-0 text-slate-600">
          建立帳號後即可累積已付款訂單的點數。
        </p>
      </div>

      <label class="grid gap-1.5 font-semibold">
        姓名
        <input
          v-model="name"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          type="text"
          autocomplete="name"
          maxlength="50"
          required
        />
      </label>

      <label class="grid gap-1.5 font-semibold">
        電子郵件
        <input
          v-model="email"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          type="email"
          autocomplete="email"
          required
        />
      </label>

      <label class="grid gap-1.5 font-semibold">
        密碼
        <input
          v-model="password"
          class="min-h-10 rounded-md border border-stone-400 px-2.5"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </label>

      <p v-if="errorMessage" class="m-0 font-semibold text-red-700">
        {{ errorMessage }}
      </p>

      <button
        class="min-h-10 rounded-md border-0 bg-slate-800 px-4 font-bold text-white disabled:opacity-65"
        type="submit"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '建立帳號中...' : '註冊' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();
const name = ref('');
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

async function submit() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await authStore.register({
      name: name.value,
      email: email.value,
      password: password.value
    });
    await router.push('/products');
  } catch {
    errorMessage.value = '無法建立這個帳號。';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
