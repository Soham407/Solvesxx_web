"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentEmployeeId } from "@/src/lib/security/getCurrentEmployeeId";
import {
  buildAlertStats,
  getAlertTypeLabel,
  getTimeAgo,
  mapPanicAlertRows,
  type AlertFilters,
  type AlertStats,
  type AlertType,
  type PanicAlert,
  type PanicAlertRow,
} from "@/src/lib/panic-alerts/panicAlertTransforms";

export type {
  AlertFilters,
  AlertStats,
  AlertType,
  PanicAlert,
} from "@/src/lib/panic-alerts/panicAlertTransforms";

export { getAlertTypeLabel, getTimeAgo } from "@/src/lib/panic-alerts/panicAlertTransforms";

export function usePanicAlertHistory(initialFilters?: AlertFilters) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<PanicAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AlertStats>({
    activeThreats: 0,
    respondingCount: 0,
    resolvedToday: 0,
    totalToday: 0,
  });
  const [filters, setFilters] = useState<AlertFilters>(initialFilters || {});

  // Fetch all alerts with filters
  const fetchAlerts = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      let query = supabase
        .from("panic_alerts")
        .select(`
          *,
          guard:security_guards(
            guard_code,
            employee:employees(first_name, last_name, phone)
          ),
          location:company_locations(location_name, location_code)
        `)
        .order("alert_time", { ascending: false });

      // Apply filters
      if (filters.status === "active") {
        query = query.eq("is_resolved", false);
      } else if (filters.status === "resolved") {
        query = query.eq("is_resolved", true);
      }

      if (filters.type) {
        query = query.eq("alert_type", filters.type);
      }

      if (filters.dateFrom) {
        query = query.gte("alert_time", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("alert_time", filters.dateTo);
      }

      if (filters.guardId) {
        query = query.eq("guard_id", filters.guardId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Map Supabase response to PanicAlert interface with proper typing
      const typedData: PanicAlert[] = mapPanicAlertRows((data || []) as PanicAlertRow[]);
      setAlerts(typedData);

      // Separate active alerts (unresolved)
      const active = typedData.filter((a) => !a.is_resolved);
      setActiveAlerts(active);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load alerts";
      console.error("Error fetching panic alerts:", err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load panic alert history",
        variant: "destructive",
      });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [filters, toast]);

  // Fetch alert statistics
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Active threats (unresolved)
      const { count: activeCount } = await supabase
        .from("panic_alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false);

      // Total today
      const { count: todayCount } = await supabase
        .from("panic_alerts")
        .select("*", { count: "exact", head: true })
        .gte("alert_time", `${today}T00:00:00`);

      // Resolved today
      const { count: resolvedCount } = await supabase
        .from("panic_alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", true)
        .gte("resolved_at", `${today}T00:00:00`);

      setStats(buildAlertStats({
        activeThreats: activeCount || 0,
        resolvedToday: resolvedCount || 0,
        totalToday: todayCount || 0,
      }));
      } catch (err: unknown) {
      console.error("Error fetching alert stats:", err);
    }
  }, []);

  // Resolve an alert (PRD: Resolution notes)
  const resolveAlert = async (alertId: string, resolutionNotes: string) => {
    try {
      const resolvedBy = await getCurrentEmployeeId();

      const { error: updateError } = await supabase
        .from("panic_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes,
        })
        .eq("id", alertId);

      if (updateError) throw updateError;

      toast({
        title: "Alert Resolved",
        description: "The incident has been marked as resolved",
      });

      // Refresh data
      fetchAlerts({ silent: true });
      fetchStats();

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resolve alert";
      console.error("Error resolving alert:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Get alert details with full info
  const getAlertDetails = async (alertId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("panic_alerts")
        .select(`
          *,
          guard:security_guards(
            guard_code,
            grade,
            employee:employees(first_name, last_name, phone, photo_url)
          ),
          location:company_locations(location_name, location_code, latitude, longitude)
        `)
        .eq("id", alertId)
        .single();

      if (fetchError) throw fetchError;

      return { success: true, data };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch alert details";
      return { success: false, error: errorMessage, data: null };
    }
  };

  // Get alert type label
  // Real-time subscription for new alerts
  useEffect(() => {
    const channel = supabase
      .channel("panic-alerts-history")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "panic_alerts",
        },
        (payload) => {
          // Show toast for new alerts
          if (payload.eventType === "INSERT") {
            toast({
              title: "🚨 New Alert!",
              description: "A new panic alert has been triggered",
              variant: "destructive",
            });
          }
          // Refresh data
          fetchAlerts();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, fetchStats, toast]);

  // Realtime delivery can be flaky in some local/prod sessions, so keep a light
  // polling fallback to ensure new SOS alerts appear without a hard refresh.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchAlerts({ silent: true });
      fetchStats();
    }, 10_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAlerts({ silent: true });
        fetchStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAlerts, fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  return {
    // Data
    alerts,
    activeAlerts,
    stats,
    isLoading,
    error,
    
    // Actions
    resolveAlert,
    getAlertDetails,
    
    // Helpers
    getAlertTypeLabel,
    getTimeAgo,
    
    // Filters
    filters,
    setFilters,
    
    // Refresh
    refresh: () => fetchAlerts(),
  };
}
