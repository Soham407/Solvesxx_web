export interface PushNotificationConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface ForegroundNotificationPayload {
  title: string;
  body: string;
  type?: string;
  priority?: string;
  raw: {
    notification?: {
      title?: string;
      body?: string;
    };
    data?: {
      type?: string;
      alertId?: string;
      priority?: string;
      title?: string;
      body?: string;
      [key: string]: string | undefined;
    };
  };
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";

  const userAgent = navigator.userAgent.toLowerCase();

  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/windows phone/i.test(userAgent)) return "windows_phone";

  return "web";
}

export function buildFirebaseConfig(): PushNotificationConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export async function registerPushServiceWorker(
  config: PushNotificationConfig
): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const postConfig = (worker: ServiceWorker | null | undefined) => {
    worker?.postMessage({ type: "FIREBASE_CONFIG", config });
  };

  postConfig(registration.active);

  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    newWorker?.addEventListener("statechange", () => {
      if (newWorker.state === "activated") {
        postConfig(newWorker);
      }
    });
  });
}

export function normalizeForegroundNotification(
  payload: ForegroundNotificationPayload["raw"]
): ForegroundNotificationPayload {
  return {
    title: payload.notification?.title || payload.data?.title || "New Notification",
    body: payload.notification?.body || payload.data?.body || "",
    type: payload.data?.type,
    priority: payload.data?.priority,
    raw: payload,
  };
}
