"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { ServiceRequest } from "@/src/types/phaseB";

interface ServiceRequestNotification {
  id: string;
  requestId: string;
  title: string;
  message: string;
  type: "assignment" | "status_change" | "priority_change" | "new_request";
  read: boolean;
  createdAt: string;
}

interface UseServiceRequestSubscriptionState {
  notifications: ServiceRequestNotification[];
  unreadCount: number;
  lastUpdate: ServiceRequest | null;
  isConnected: boolean;
}

interface UseServiceRequestSubscriptionReturn extends UseServiceRequestSubscriptionState {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for real-time service request subscriptions
 * Listens for assignments, status changes, and new requests
 */
export function useServiceRequestSubscription(
  employeeId?: string,
  options?: { autoConnect?: boolean }
): UseServiceRequestSubscriptionReturn {
  const [state, setState] = useState<UseServiceRequestSubscriptionState>({
    notifications: [],
    unreadCount: 0,
    lastUpdate: null,
    isConnected: false,
  });

  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Add notification helper
  const addNotification = useCallback((notification: ServiceRequestNotification) => {
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...prev.notifications].slice(0, 50), // Keep last 50
      unreadCount: prev.unreadCount + 1,
    }));
  }, []);

  // Connect to real-time subscriptions
  const connect = useCallback(() => {
    if (!employeeId) {
      console.warn("Cannot connect: employeeId is required");
      return;
    }

    // Disconnect existing channel if any
    if (channel) {
      channel.unsubscribe();
    }

    // Create new channel
    const newChannel = supabase
      .channel(`service-requests-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_requests",
        },
        (payload) => {
          const newRequest = payload.new as ServiceRequest;
          
          // If assigned to current user
          if (newRequest.assigned_to === employeeId) {
            addNotification({
              id: `new-${newRequest.id}`,
              requestId: newRequest.id,
              title: "New Request Assigned",
              message: `Request #${newRequest.request_number} has been assigned to you`,
              type: "assignment",
              read: false,
              createdAt: new Date().toISOString(),
            });
            setState((prev) => ({ ...prev, lastUpdate: newRequest }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: employeeId ? `assigned_to=eq.${employeeId}` : undefined,
        },
        (payload) => {
          const updatedRequest = payload.new as ServiceRequest;
          const oldRequest = payload.old as ServiceRequest;

          // Status change notification
          if (updatedRequest.status !== oldRequest.status) {
            addNotification({
              id: `status-${updatedRequest.id}-${Date.now()}`,
              requestId: updatedRequest.id,
              title: "Status Updated",
              message: `Request #${updatedRequest.request_number} status changed to ${updatedRequest.status}`,
              type: "status_change",
              read: false,
              createdAt: new Date().toISOString(),
            });
          }

          // Priority change notification
          if (updatedRequest.priority !== oldRequest.priority) {
            addNotification({
              id: `priority-${updatedRequest.id}-${Date.now()}`,
              requestId: updatedRequest.id,
              title: "Priority Updated",
              message: `Request #${updatedRequest.request_number} priority changed to ${updatedRequest.priority}`,
              type: "priority_change",
              read: false,
              createdAt: new Date().toISOString(),
            });
          }

          // Assignment change notification
          if (updatedRequest.assigned_to !== oldRequest.assigned_to) {
            if (updatedRequest.assigned_to === employeeId) {
              addNotification({
                id: `assign-${updatedRequest.id}-${Date.now()}`,
                requestId: updatedRequest.id,
                title: "Request Assigned",
                message: `Request #${updatedRequest.request_number} has been assigned to you`,
                type: "assignment",
                read: false,
                createdAt: new Date().toISOString(),
              });
            }
          }

          setState((prev) => ({ ...prev, lastUpdate: updatedRequest }));
        }
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    setChannel(newChannel);
  }, [employeeId, channel, addNotification]);

  // Disconnect from subscriptions
  const disconnect = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
      setState((prev) => ({ ...prev, isConnected: false }));
    }
  }, [channel]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
    }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (options?.autoConnect !== false && employeeId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [employeeId, options?.autoConnect, connect, disconnect]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    connect,
    disconnect,
  };
}

export type { ServiceRequestNotification };
