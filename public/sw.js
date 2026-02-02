// Botsy Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: data.icon || '/brand/botsy-icon.svg',
    badge: data.badge || '/brand/botsy-icon.svg',
    tag: data.tag || 'botsy-notification',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Åpne',
      },
      {
        action: 'dismiss',
        title: 'Lukk',
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Botsy', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'dismiss') return

  const urlToOpen = event.notification.data?.url || '/admin'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If we have a client, focus it
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus().then(function(focusedClient) {
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(urlToOpen)
            }
          })
        }
      }
      // If no client, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener('install', function() {
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim())
})
