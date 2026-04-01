"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUserId } from "@/src/lib/security/getCurrentUserId";

/**
 * Panic Alert History Hook
 * PRD Reference: "Instant Panic Response" (I) + "Society Manager Dashboard" (IV - Panic Logs)
 * 
 * Features:
 * - History of SOS alerts with resolution notes
 * - GPS location at time of alert
 * - Alert types: Medical, Fire, Theft, Security
 * - Filter by date range, type, status
 */

export type AlertType = "panic" | "inactivity" | "geo_fence_breach" | "checklist_incomplete" | "routine";

export interface PanicAlert {
  id: string;
  guard_id: string;
  alert_type: AlertType;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  alert_time: string;
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  // Joined data
  guard?: {
    guard_code: string;
    employee?: {
      first_name: string;
      last_name: string;
      phone: string;
    };
  };
  location?: {
    location_name: string;
    location_code: string;
  };
  resolver?: {
    full_name: string | null;
    employee?: {
      first_name: string | null;
      last_name: string | null;
    };
  };
}

export interface AlertStats {
  activeThreats: number;
  respondingCount: number;
  resolvedToday: number;
  totalToday: number;
}

export interface AlertFilters {
  status?: "active" | "resolved" | "all";
  type?: AlertType;
  dateFrom?: string;
  dateTo?: string;
  guardId?: string;
}

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
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
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
          location:company_locations(location_name, location_code),
          resolver:users!panic_alerts_resolved_by_fkey(
            full_name,
            employee:employees(first_name, last_name)
          )
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
      const typedData: PanicAlert[] = ((data || []) as any[]).map((row) => ({
        id: row.id,
        guard_id: row.guard_id,
        alert_type: row.alert_type as AlertType,
        location_id: row.location_id,
        latitude: row.latitude,
        longitude: row.longitude,
        alert_time: row.alert_time,
        description: row.description,
        is_resolved: row.is_resolved,
        resolved_at: row.resolved_at,
        resolved_by: row.resolved_by,
        resolution_notes: row.resolution_notes,
        created_at: row.created_at,
        guard: row.guard as PanicAlert["guard"],
        location: row.location as PanicAlert["location"],
        resolver: row.resolver as PanicAlert["resolver"],
      }));
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
      setIsLoading(false);
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

      setStats({
        activeThreats: activeCount || 0,
        respondingCount: 0, // This would need a "responding" status in the table
        resolvedToday: resolvedCount || 0,
        totalToday: todayCount || 0,
      });
    } catch (err) {
      console.error("Error fetching alert stats:", err);
    }
  }, []);

  // Resolve an alert (PRD: Resolution notes)
  const resolveAlert = async (alertId: string, resolutionNotes: string) => {
    try {
      const resolvedBy = await getCurrentUserId();

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
      fetchAlerts();
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
  const getAlertTypeLabel = (type: AlertType): string => {
    const labels: Record<AlertType, string> = {
      panic: "Panic/SOS",
      inactivity: "Inactivity",
      geo_fence_breach: "Geo-fence Breach",
      checklist_incomplete: "Checklist Missed",
      routine: "Routine",
    };
    return labels[type] || type;
  };

  // Get time ago string
  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just Now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

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
    refresh: fetchAlerts,
  };
}
