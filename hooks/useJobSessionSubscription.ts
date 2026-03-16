"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { JobSession, JobPhoto } from "@/src/types/operations";

type JobSessionStatus = "started" | "paused" | "completed" | "cancelled";

interface JobSessionNotification {
  id: string;
  sessionId: string;
  serviceRequestId: string;
  title: string;
  message: string;
  type: "session_started" | "session_paused" | "session_completed" | "photo_uploaded" | "session_cancelled";
  read: boolean;
  createdAt: string;
  metadata?: {
    photoUrl?: string;
    duration?: number;
    technicianName?: string;
  };
}

interface UseJobSessionSubscriptionState {
  notifications: JobSessionNotification[];
  unreadCount: number;
  activeSessions: JobSession[];
  lastUpdate: JobSession | null;
  isConnected: boolean;
}

interface UseJobSessionSubscriptionReturn extends UseJobSessionSubscriptionState {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  connect: () => void;
  disconnect: () => void;
  getActiveSessionForRequest: (requestId: string) => JobSession | undefined;
}

/**
 * Hook for real-time job session subscriptions
 * Listens for session status changes, photo uploads, and completions
 */
export function useJobSessionSubscription(
  employeeId?: string,
  options?: { 
    autoConnect?: boolean;
    listenToAllInSociety?: boolean;
    societyId?: string;
  }
): UseJobSessionSubscriptionReturn {
  const [state, setState] = useState<UseJobSessionSubscriptionState>({
    notifications: [],
    unreadCount: 0,
    activeSessions: [],
    lastUpdate: null,
    isConnected: false,
  });

  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [photoChannel, setPhotoChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Add notification helper
  const addNotification = useCallback((notification: JobSessionNotification) => {
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...prev.notifications].slice(0, 50), // Keep last 50
      unreadCount: prev.unreadCount + 1,
    }));
  }, []);

  // Update active sessions list
  const updateActiveSessions = useCallback((session: JobSession) => {
    setState((prev) => {
      const filtered = prev.activeSessions.filter(
        (s) => s.id !== session.id && s.service_request_id !== session.service_request_id
      );
      
      if (session.status === "started" || session.status === "paused") {
        return {
          ...prev,
          activeSessions: [...filtered, session],
        };
      }
      
      return {
        ...prev,
        activeSessions: filtered,
      };
    });
  }, []);

  // Connect to real-time subscriptions
  const connect = useCallback(() => {
    // Disconnect existing channels if any
    if (channel) channel.unsubscribe();
    if (photoChannel) photoChannel.unsubscribe();

    // Build filter based on options
    let sessionFilter: string | undefined;
    if (employeeId && !options?.listenToAllInSociety) {
      sessionFilter = `technician_id=eq.${employeeId}`;
    }

    // Job Sessions Channel
    const newChannel = supabase
      .channel(`job-sessions-${employeeId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_sessions",
          filter: sessionFilter,
        },
        async (payload) => {
          const newSession = payload.new as JobSession;
          
          // Fetch service request details
          const { data: request } = await supabase
            .from("service_requests")
            .select("request_number")
            .eq("id", newSession.service_request_id)
            .single();

          addNotification({
            id: `session-start-${newSession.id}`,
            sessionId: newSession.id,
            serviceRequestId: newSession.service_request_id,
            title: "Job Session Started",
            message: `Work started on request #${request?.request_number || newSession.service_request_id}`,
            type: "session_started",
            read: false,
            createdAt: new Date().toISOString(),
            metadata: {
              technicianName: newSession.technician_id === employeeId ? "You" : undefined,
            },
          });

          updateActiveSessions(newSession);
          setState((prev) => ({ ...prev, lastUpdate: newSession }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "job_sessions",
          filter: sessionFilter,
        },
        async (payload) => {
          const updatedSession = payload.new as JobSession;
          const oldSession = payload.old as JobSession;

          // Fetch service request details
          const { data: request } = await supabase
            .from("service_requests")
            .select("request_number")
            .eq("id", updatedSession.service_request_id)
            .single();

          // Status change notifications
          if (updatedSession.status !== oldSession.status) {
            let notification: JobSessionNotification | null = null;

            switch (updatedSession.status) {
              case "started":
                if (oldSession.status === "paused") {
                  notification = {
                    id: `session-resume-${updatedSession.id}-${Date.now()}`,
                    sessionId: updatedSession.id,
                    serviceRequestId: updatedSession.service_request_id,
                    title: "Job Session Resumed",
                    message: `Work resumed on request #${request?.request_number || updatedSession.service_request_id}`,
                    type: "session_started",
                    read: false,
                    createdAt: new Date().toISOString(),
                  };
                }
                break;

              case "paused":
                notification = {
                  id: `session-pause-${updatedSession.id}-${Date.now()}`,
                  sessionId: updatedSession.id,
                  serviceRequestId: updatedSession.service_request_id,
                  title: "Job Session Paused",
                  message: `Work paused on request #${request?.request_number || updatedSession.service_request_id}`,
                  type: "session_paused",
                  read: false,
                  createdAt: new Date().toISOString(),
                };
                break;

              case "completed":
                const duration = updatedSession.end_time && updatedSession.start_time
                  ? Math.round((new Date(updatedSession.end_time).getTime() - new Date(updatedSession.start_time).getTime()) / 60000)
                  : 0;
                
                notification = {
                  id: `session-complete-${updatedSession.id}-${Date.now()}`,
                  sessionId: updatedSession.id,
                  serviceRequestId: updatedSession.service_request_id,
                  title: "Job Session Completed",
                  message: `Request #${request?.request_number || updatedSession.service_request_id} completed${duration > 0 ? ` (${duration} mins)` : ""}`,
                  type: "session_completed",
                  read: false,
                  createdAt: new Date().toISOString(),
                  metadata: {
                    duration,
                  },
                };
                break;

              case "cancelled":
                notification = {
                  id: `session-cancel-${updatedSession.id}-${Date.now()}`,
                  sessionId: updatedSession.id,
                  serviceRequestId: updatedSession.service_request_id,
                  title: "Job Session Cancelled",
                  message: `Work cancelled on request #${request?.request_number || updatedSession.service_request_id}`,
                  type: "session_cancelled",
                  read: false,
                  createdAt: new Date().toISOString(),
                };
                break;
            }

            if (notification) {
              addNotification(notification);
            }
          }

          updateActiveSessions(updatedSession);
          setState((prev) => ({ ...prev, lastUpdate: updatedSession }));
        }
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    // Job Photos Channel - for photo upload notifications
    const newPhotoChannel = supabase
      .channel(`job-photos-${employeeId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_photos",
        },
        async (payload) => {
          const newPhoto = payload.new as JobPhoto;
          
          // Only notify if it's related to a session we're tracking
          const isRelevantSession = state.activeSessions.some(
            (s) => s.id === newPhoto.job_session_id
          );

          if (isRelevantSession || options?.listenToAllInSociety) {
            // Fetch session and request details
            const { data: session } = await supabase
              .from("job_sessions")
              .select("service_request_id")
              .eq("id", newPhoto.job_session_id)
              .single();

            if (session) {
              const { data: request } = await supabase
                .from("service_requests")
                .select("request_number")
                .eq("id", session.service_request_id)
                .single();

              addNotification({
                id: `photo-${newPhoto.id}`,
                sessionId: newPhoto.job_session_id,
                serviceRequestId: session.service_request_id,
                title: "Photo Uploaded",
                message: `New ${newPhoto.photo_type} photo added to request #${request?.request_number || session.service_request_id}`,
                type: "photo_uploaded",
                read: false,
                createdAt: new Date().toISOString(),
                metadata: {
                  photoUrl: newPhoto.photo_url,
                },
              });
            }
          }
        }
      )
      .subscribe();

    setChannel(newChannel);
    setPhotoChannel(newPhotoChannel);
  }, [employeeId, options?.listenToAllInSociety, channel, photoChannel, addNotification, updateActiveSessions, state.activeSessions]);

  // Disconnect from subscriptions
  const disconnect = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
    if (photoChannel) {
      photoChannel.unsubscribe();
      setPhotoChannel(null);
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, [channel, photoChannel]);

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

  // Get active session for a specific request
  const getActiveSessionForRequest = useCallback(
    (requestId: string): JobSession | undefined => {
      return state.activeSessions.find(
        (s) => s.service_request_id === requestId && 
        (s.status === "started" || s.status === "paused")
      );
    },
    [state.activeSessions]
  );

  // Auto-connect on mount
  useEffect(() => {
    if (options?.autoConnect !== false && (employeeId || options?.listenToAllInSociety)) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [employeeId, options?.autoConnect, options?.listenToAllInSociety, connect, disconnect]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    connect,
    disconnect,
    getActiveSessionForRequest,
  };
}

export type { JobSessionNotification, JobSessionStatus };
