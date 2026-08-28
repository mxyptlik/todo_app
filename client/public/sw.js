self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : { title: 'Daylist reminder', body: 'A scheduled item is due.', url: '/' };
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: '/favicon.ico', silent: false, data: { url: payload.url || '/' }, tag: `daylist-${payload.title}`, renotify: true }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => windows[0] ? windows[0].focus() : clients.openWindow(event.notification.data.url)));
});
