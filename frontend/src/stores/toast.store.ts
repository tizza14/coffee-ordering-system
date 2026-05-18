import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let nextId = 1;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function add(type: ToastType, message: string, duration = 3500) {
    const id = nextId++;
    toasts.value.push({ id, type, message });
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
  }

  return {
    toasts,
    remove,
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg),
    info: (msg: string) => add('info', msg)
  };
});
