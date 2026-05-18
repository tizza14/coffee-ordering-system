import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export const useConfirmStore = defineStore('confirm', () => {
  const isVisible = ref(false);
  const options = ref<ConfirmOptions>({ title: '', message: '' });
  let resolver: ((value: boolean) => void) | null = null;

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts;
    isVisible.value = true;
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function respond(result: boolean) {
    isVisible.value = false;
    resolver?.(result);
    resolver = null;
  }

  return { isVisible, options, confirm, respond };
});
