self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '咖啡訂單通知', body: event.data.text() };
  }

  const title = payload.title ?? '咖啡訂單通知';
  const options = {
    body: payload.body ?? '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'coffee-order',
    renotify: true,
    data: { url: payload.url ?? '/orders/my' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/orders/my';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      return clients.openWindow(url);
    })
  );
});
