<template>
  <button
    v-if="isSupported"
    class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-bold transition-colors"
    :class="
      isSubscribed
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
        : 'border-stone-300 bg-white text-amber-950 hover:border-amber-900 hover:bg-amber-50'
    "
    type="button"
    :disabled="isWorking"
    @click="toggle"
  >
    <span>{{ isSubscribed ? '🔔' : '🔕' }}</span>
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { usePushNotification } from '../composables/usePushNotification';
import { useAuthStore } from '../stores/auth.store';

const { isSupported, isSubscribed, permission, init, subscribe, unsubscribe } = usePushNotification();
const authStore = useAuthStore();
const isWorking = ref(false);

const label = computed(() => {
  if (isWorking.value) return '處理中...';
  if (permission.value === 'denied') return '通知已封鎖';
  return isSubscribed.value ? '推播已開啟' : '開啟推播通知';
});

async function toggle() {
  if (permission.value === 'denied' || isWorking.value) return;
  isWorking.value = true;
  try {
    if (isSubscribed.value) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  } finally {
    isWorking.value = false;
  }
}

onMounted(async () => {
  if (authStore.isAuthenticated) await init();
});
</script>
