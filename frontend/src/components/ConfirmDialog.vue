<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="confirmStore.isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="msgId"
        @mousedown.self="confirmStore.respond(false)"
        @keydown.esc="confirmStore.respond(false)"
      >
        <Transition name="dialog">
          <div
            v-if="confirmStore.isVisible"
            class="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
            tabindex="-1"
            ref="dialogEl"
          >
            <h2 :id="titleId" class="m-0 text-lg font-bold text-amber-950">
              {{ confirmStore.options.title }}
            </h2>
            <p :id="msgId" class="mb-0 mt-2 text-stone-600">
              {{ confirmStore.options.message }}
            </p>
            <div class="mt-5 flex justify-end gap-3">
              <button
                class="min-h-9 cursor-pointer rounded-md border border-stone-400 bg-white px-4 font-bold text-amber-950 hover:border-stone-600"
                type="button"
                @click="confirmStore.respond(false)"
              >
                {{ confirmStore.options.cancelLabel ?? '取消' }}
              </button>
              <button
                class="min-h-9 cursor-pointer rounded-md px-4 font-bold text-white"
                :class="
                  confirmStore.options.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-900 hover:bg-amber-800'
                "
                type="button"
                @click="confirmStore.respond(true)"
              >
                {{ confirmStore.options.confirmLabel ?? '確認' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useConfirmStore } from '../stores/confirm.store';

const confirmStore = useConfirmStore();
const dialogEl = ref<HTMLElement | null>(null);
const titleId = 'confirm-dialog-title';
const msgId = 'confirm-dialog-message';

watch(
  () => confirmStore.isVisible,
  async (visible) => {
    if (visible) {
      await nextTick();
      dialogEl.value?.focus();
    }
  }
);
</script>

<style scoped>
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
