import { computed, ref } from 'vue';
import { http } from '../api/http';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const registration = ref<ServiceWorkerRegistration | null>(null);
const permission = ref<NotificationPermission>(
  typeof Notification !== 'undefined' ? Notification.permission : 'default'
);
const isSubscribed = ref(false);

async function init() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    registration.value = await navigator.serviceWorker.register('/sw.js');
    const existing = await registration.value.pushManager.getSubscription();
    isSubscribed.value = Boolean(existing);
    permission.value = Notification.permission;
  } catch {
    // SW registration failed (e.g., HTTP in non-localhost) — skip silently
  }
}

async function subscribe() {
  if (!VAPID_PUBLIC_KEY || !registration.value) return;

  const result = await Notification.requestPermission();
  permission.value = result;
  if (result !== 'granted') return;

  const sub = await registration.value.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  const json = sub.toJSON();
  await http.post('/notifications/push/subscribe', {
    endpoint: json.endpoint,
    keys: { auth: json.keys?.auth, p256dh: json.keys?.p256dh }
  });
  isSubscribed.value = true;
}

async function unsubscribe() {
  if (!registration.value) return;
  const sub = await registration.value.pushManager.getSubscription();
  if (sub) {
    await http.delete('/notifications/push/unsubscribe', {
      data: { endpoint: sub.endpoint }
    });
    await sub.unsubscribe();
  }
  isSubscribed.value = false;
}

const isSupported = computed(
  () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)
);

export function usePushNotification() {
  return { isSupported, permission, isSubscribed, init, subscribe, unsubscribe };
}
