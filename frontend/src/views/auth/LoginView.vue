<template>
  <section
    class="grid min-h-[calc(100vh-64px)] place-items-center bg-amber-50 p-4 sm:p-6"
  >
    <form
      class="grid w-full max-w-[420px] gap-4 rounded-lg border border-stone-300 bg-white p-4 sm:p-6"
      @submit.prevent="submit"
    >
      <div>
        <h1 class="m-0 text-2xl font-bold text-amber-950">登入</h1>
        <p class="m-0 text-stone-600">
          使用帳號登入後即可點會員訂單並累積點數。
        </p>
      </div>

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
          autocomplete="current-password"
          minlength="8"
          required
        />
      </label>

      <p v-if="errorMessage" class="m-0 font-semibold text-red-700">
        {{ errorMessage }}
      </p>

      <button
        class="min-h-10 rounded-md border-0 bg-amber-900 px-4 font-bold text-white disabled:opacity-65"
        type="submit"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '登入中...' : '登入' }}
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
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

async function submit() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await authStore.login({ email: email.value, password: password.value });
    await router.push('/products');
  } catch {
    errorMessage.value = '無法使用這組帳密登入。';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
