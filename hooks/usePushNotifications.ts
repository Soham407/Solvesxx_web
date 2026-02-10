"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";

interface PushNotificationState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
}

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: {
    type?: string;
    alertId?: string;
    priority?: string;
    [key: string]: any;
  };
}

/**
 * Hook for managing Firebase Cloud Messaging push notifications
 * Handles permission request, token registration with Supabase, and foreground message handling
 */
export function usePushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isPermissionGranted: false,
    isRegistered: false,
    isLoading: true,
    token: null,
    error: null,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        typeof window !== 'undefined' && 
        'Notification' in window && 
        'serviceWorker' in navigator;
      
      setState(prev => ({
        ...prev,
        isSupported: supported,
        isLoading: false,
        isPermissionGranted: supported && Notification.permission === 'granted',
      }));
    };

    checkSupport();
  }, []);

  // Register service worker and send Firebase config
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase messaging SW registered:', registration.scope);
        // Send Firebase config to the service worker (it can't access process.env)
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        if (registration.active) {
          registration.active.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
        }
        // Also send when the SW becomes active (first install)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              newWorker.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
            }
          });
        });
      })
      .catch((error) => {
        console.error('Firebase messaging SW registration failed:', error);
      });
  }, []);

  /**
   * Request notification permission and register token with Supabase
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to enable notifications");
      }

      // Request permission and get FCM token
      const token = await requestNotificationPermission();

      if (!token) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPermissionGranted: false,
          error: "Notification permission was denied or not supported",
        }));
        return false;
      }

      // Save token to Supabase
      const { error: insertError } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          token_type: 'fcm',
          device_type: getDeviceType(),
          last_used: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: 'user_id,token',
        });

      if (insertError) {
        console.error('Failed to save push token:', insertError);
        throw new Error("Failed to register for notifications");
      }

      // Set up foreground message handler
      const unsubscribe = await onForegroundMessage(handleForegroundMessage);
      unsubscribeRef.current = unsubscribe;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPermissionGranted: true,
        isRegistered: true,
        token: token,
      }));

      toast({
        title: "Notifications Enabled",
        description: "You will now receive push notifications for alerts.",
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to enable notifications";
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast({
        title: "Notification Setup Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    }
  }, [toast]);

  /**
   * Handle foreground messages (when app is open)
   */
  const handleForegroundMessage = useCallback((payload: NotificationPayload) => {
    const title = payload.notification?.title || payload.data?.title || "New Notification";
    const body = payload.notification?.body || payload.data?.body || "";
    const type = payload.data?.type;
    const priority = payload.data?.priority;

    // Show toast for foreground notifications
    toast({
      title: priority === 'critical' ? `🚨 ${title}` : title,
      description: body,
      variant: priority === 'critical' ? "destructive" : "default",
      duration: priority === 'critical' ? 10000 : 5000,
    });

    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('fcm-message', { detail: payload }));
  }, [toast]);

  /**
   * Unregister push notifications
   */
  const unregister = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && state.token) {
        await supabase
          .from('push_tokens')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('token', state.token);
      }

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isRegistered: false,
        token: null,
      }));

      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
    }
  }, [state.token, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    ...state,
    requestPermission,
    unregister,
  };
}

/**
 * Detect device type for analytics
 */
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/windows phone/i.test(userAgent)) return 'windows_phone';
  
  return 'web';
}
