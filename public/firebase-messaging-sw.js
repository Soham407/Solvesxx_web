// ============================================
// Firebase Cloud Messaging Service Worker
// This file MUST be in the public folder
// Config is injected at runtime via postMessage
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

let messagingInstance = null;

// Listen for Firebase config from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
      messagingInstance = firebase.messaging();
      setupBackgroundMessageHandler(messagingInstance);
      console.log('[firebase-messaging-sw.js] Firebase initialized with runtime config');
    }
  }
});

function setupBackgroundMessageHandler(messaging) {
  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'SOLVESXX Alert';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: payload.data?.tag || 'facility-notification',
      data: payload.data,
      // Vibration pattern for emergency alerts
      vibrate: payload.data?.priority === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
      // Keep notification visible
      requireInteraction: payload.data?.priority === 'critical',
      // Actions for panic alerts
      actions: payload.data?.type === 'panic_alert' ? [
        { action: 'view', title: 'View Alert' },
        { action: 'resolve', title: 'Resolve' }
      ] : []
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Determine URL based on notification type and action
  let url = '/dashboard';
  
  if (data?.type === 'panic_alert') {
    url = '/society/panic-alerts';
  } else if (data?.type === 'checklist_reminder') {
    url = '/test-guard'; // Guard dashboard
  } else if (data?.type === 'visitor_arrived') {
    url = '/society/visitors';
  }

  // If specific action was clicked
  if (action === 'resolve' && data?.alertId) {
    url = `/society/panic-alerts?resolve=${data.alertId}`;
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
