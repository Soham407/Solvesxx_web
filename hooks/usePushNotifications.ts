"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import {
  buildFirebaseConfig,
  getDeviceType,
  isPushSupported,
  normalizeForegroundNotification,
  registerPushServiceWorker,
} from "@/src/lib/push/pushNotifications";
import {
  deactivatePushToken,
  registerPushToken,
} from "@/src/lib/push/pushNotificationPersistence";

interface PushNotificationState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
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
      const supported = isPushSupported();

      setState((prev) => ({
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
    void registerPushServiceWorker(buildFirebaseConfig()).catch((error) => {
      console.error("Firebase messaging SW registration failed:", error);
    });
  }, []);

  /**
   * Request notification permission and register token with Supabase
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to enable notifications");
      }

      // Request permission and get FCM token
      const token = await requestNotificationPermission();

      if (!token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPermissionGranted: false,
          error: "Notification permission was denied or not supported",
        }));
        return false;
      }

      // Save token to Supabase
      await registerPushToken(supabase, {
        userId: user.id,
        token,
        deviceType: getDeviceType(),
      });

      // Set up foreground message handler
      const unsubscribe = await onForegroundMessage(handleForegroundMessage);
      unsubscribeRef.current = unsubscribe;

      setState((prev) => ({
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
  const handleForegroundMessage = useCallback((payload: Parameters<typeof normalizeForegroundNotification>[0]) => {
    const notification = normalizeForegroundNotification(payload);

    // Show toast for foreground notifications
    toast({
      title: notification.priority === "critical" ? `🚨 ${notification.title}` : notification.title,
      description: notification.body,
      variant: notification.priority === "critical" ? "destructive" : "default",
      duration: notification.priority === "critical" ? 10000 : 5000,
    });

    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent("fcm-message", { detail: notification.raw }));
  }, [toast]);

  /**
   * Unregister push notifications
   */
  const unregister = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && state.token) {
        await deactivatePushToken(supabase, {
          userId: user.id,
          token: state.token,
          deviceType: getDeviceType(),
        });
      }

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        isRegistered: false,
        token: null,
      }));

      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (error) {
      console.error("Failed to unregister push notifications:", error);
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
