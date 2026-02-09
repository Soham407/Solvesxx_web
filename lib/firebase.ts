// ============================================
// Firebase Configuration with Cloud Messaging
// ============================================
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX-dx3tqYe1BFzB_vus2G9CoUuXYXLzpw",
  authDomain: "facilitypro-81bde.firebaseapp.com",
  projectId: "facilitypro-81bde",
  storageBucket: "facilitypro-81bde.firebasestorage.app",
  messagingSenderId: "675663268881",
  appId: "1:675663268881:web:6767c3c25ca3e716ef75b0",
  measurementId: "G-TMFTHD5676"
};

// Initialize Firebase (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Cloud Messaging instance (lazy initialization)
let messagingInstance: Messaging | null = null;

/**
 * Get Firebase Cloud Messaging instance
 * Returns null if browser doesn't support it (e.g., Safari without service worker)
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  
  const supported = await isSupported();
  if (!supported) {
    console.warn('Firebase Cloud Messaging is not supported in this browser');
    return null;
  }
  
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  
  return messagingInstance;
}

/**
 * Request notification permission and get FCM token
 * @returns FCM token or null if permission denied/unsupported
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get FCM token
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // VAPID key from Firebase Console > Cloud Messaging > Web configuration
    // You need to generate this in Firebase Console
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    
    if (!vapidKey) {
      console.error('VAPID key not configured. Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local');
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    
    if (token) {
      console.log('FCM Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Subscribe to foreground messages
 * @param callback Function to call when message received
 * @returns Unsubscribe function
 */
export async function onForegroundMessage(
  callback: (payload: any) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });

  return unsubscribe;
}

export { app };
export default app;
