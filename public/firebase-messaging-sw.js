// ============================================
// Firebase Cloud Messaging Service Worker
// This file MUST be in the public folder
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration (must match lib/firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyDX-dx3tqYe1BFzB_vus2G9CoUuXYXLzpw",
  authDomain: "facilitypro-81bde.firebaseapp.com",
  projectId: "facilitypro-81bde",
  storageBucket: "facilitypro-81bde.firebasestorage.app",
  messagingSenderId: "675663268881",
  appId: "1:675663268881:web:6767c3c25ca3e716ef75b0",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'FacilityPro Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
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
