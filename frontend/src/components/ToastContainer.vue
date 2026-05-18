<template>
  <div
    class="fixed right-4 top-20 z-50 flex flex-col gap-2 sm:right-6"
    aria-live="polite"
    aria-label="通知"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="flex w-72 items-start gap-3 rounded-lg border px-4 py-3 shadow-lg sm:w-80"
        :class="styleMap[toast.type]"
        role="alert"
      >
        <span class="flex-1 text-sm font-semibold leading-snug">{{ toast.message }}</span>
        <button
          type="button"
          class="mt-0.5 shrink-0 opacity-60 hover:opacity-100"
          aria-label="關閉"
          @click="toastStore.remove(toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast.store';

const toastStore = useToastStore();

const styleMap = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  error:   'bg-red-50 border-red-300 text-red-800',
  info:    'bg-blue-50 border-blue-300 text-blue-800'
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
