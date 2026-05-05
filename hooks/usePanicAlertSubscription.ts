"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getCurrentEmployeeId } from "@/src/lib/security/getCurrentEmployeeId";
import {
  mapPanicAlertSubscriptionRow,
  type PanicAlert,
  type PanicAlertSubscriptionRow,
} from "@/src/lib/panic-alerts/panicAlertTransforms";

interface PanicAlertSubscriptionState {
  alerts: PanicAlert[];
  unresolvedCount: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  latestAlert: PanicAlert | null;
}

/**
 * Hook for Society Managers and Security Supervisors to receive
 * real-time panic alerts via Supabase Realtime subscriptions.
 * 
 * This hook:
 * 1. Fetches existing unresolved alerts on mount
 * 2. Subscribes to INSERT events on panic_alerts table
 * 3. Updates state in real-time when new alerts arrive
 */
export function usePanicAlertSubscription() {
  const [state, setState] = useState<PanicAlertSubscriptionState>({
    alerts: [],
    unresolvedCount: 0,
    isLoading: true,
    isConnected: false,
    error: null,
    latestAlert: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewAlertCallbackRef = useRef<((alert: PanicAlert) => void) | null>(null);

  /**
   * Fetch existing unresolved panic alerts
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("panic_alerts")
        .select(`
          id,
          guard_id,
          alert_type,
          location_id,
          photo_url,
          latitude,
          longitude,
          alert_time,
          description,
          is_resolved,
          resolved_at,
          resolved_by,
          resolution_notes,
          created_at,
          guard:security_guards (
            guard_code,
            employee:employees (
              first_name,
              last_name,
              phone
            )
          ),
          location:company_locations (
            location_name
          )
        `)
        .eq("is_resolved", false)
        .order("alert_time", { ascending: false });

      if (error) throw error;

      // Transform data — PostgREST returns typed data with aliases
      const alerts: PanicAlert[] = (data || []).map((a) => mapPanicAlertSubscriptionRow(a as PanicAlertSubscriptionRow));

      setState((prev) => ({
        ...prev,
        alerts,
        unresolvedCount: alerts.length,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      console.error("Error fetching panic alerts:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load panic alerts",
      }));
    }
  }, []);

  /**
   * Subscribe to real-time panic alerts
   */
  const subscribe = useCallback(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("panic-alerts-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "panic_alerts",
        },
        async (payload) => {
          // A new panic alert was inserted
          const newAlert = payload.new as Partial<PanicAlert>;

          // Fetch full alert data with relations using aliased joins
          const { data, error } = await supabase
            .from("panic_alerts")
            .select(`
              id,
              guard_id,
              alert_type,
              location_id,
              photo_url,
              latitude,
              longitude,
              alert_time,
              description,
              is_resolved,
              resolved_at,
              resolved_by,
              resolution_notes,
              created_at,
              guard:security_guards (
                guard_code,
                employee:employees (
                  first_name,
                  last_name,
                  phone
                )
              ),
              location:company_locations (
                location_name
              )
            `)
            .eq("id", newAlert.id as string)
            .single();

          if (!error && data) {
            const fullAlert = mapPanicAlertSubscriptionRow(data as PanicAlertSubscriptionRow);

            setState((prev) => ({
              ...prev,
              alerts: [fullAlert, ...prev.alerts],
              unresolvedCount: prev.unresolvedCount + 1,
              latestAlert: fullAlert,
            }));

            // Call the callback if registered
            if (onNewAlertCallbackRef.current) {
              onNewAlertCallbackRef.current(fullAlert);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "panic_alerts",
        },
        (payload) => {
          // An alert was updated (e.g., resolved)
          const updatedAlert = payload.new as Partial<PanicAlert>;

          setState((prev) => {
            const updatedAlerts = prev.alerts.map((a) =>
              a.id === updatedAlert.id
                ? { ...a, ...updatedAlert }
                : a
            );

            // If resolved, remove from list
            const filteredAlerts = updatedAlerts.filter((a) => !a.is_resolved);

            return {
              ...prev,
              alerts: filteredAlerts,
              unresolvedCount: filteredAlerts.length,
            };
          });
        }
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    channelRef.current = channel;
  }, []);

  /**
   * Resolve a panic alert
   */
  const resolveAlert = useCallback(
    async (
      alertId: string,
      resolutionNotes?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const resolvedBy = await getCurrentEmployeeId();

        const { error } = await supabase
          .from("panic_alerts")
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy,
            resolution_notes: resolutionNotes || "Alert resolved by manager",
          })
          .eq("id", alertId);

        if (error) throw error;

        // Optimistically update local state
        setState((prev) => ({
          ...prev,
          alerts: prev.alerts.filter((a) => a.id !== alertId),
          unresolvedCount: Math.max(0, prev.unresolvedCount - 1),
        }));

        return { success: true };
      } catch (err) {
        console.error("Error resolving alert:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to resolve alert",
        };
      }
    },
    []
  );

  /**
   * Register a callback for new alerts (e.g., to play sound or show toast)
   */
  const onNewAlert = useCallback((callback: (alert: PanicAlert) => void) => {
    onNewAlertCallbackRef.current = callback;
  }, []);

  /**
   * Clear latest alert (after user acknowledges)
   */
  const clearLatestAlert = useCallback(() => {
    setState((prev) => ({ ...prev, latestAlert: null }));
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await fetchAlerts();
  }, [fetchAlerts]);

  // Initialize on mount
  useEffect(() => {
    fetchAlerts();
    subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchAlerts, subscribe]);

  return {
    ...state,
    resolveAlert,
    onNewAlert,
    clearLatestAlert,
    refresh,
  };
}
